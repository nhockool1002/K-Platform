import { Injectable } from '@nestjs/common';
import type { Prisma } from '../prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditActionType, AuditLevel } from '../prisma/client.js';
import { auditStorage } from './audit-context.js';

export interface AuditEntry {
  actionType: AuditActionType;
  targetResource: string;
  level?: AuditLevel;
  actorId?: string | null;
  actorRole?: string | null;
  statusCode?: number | null;
  payloadBefore?: Prisma.InputJsonValue;
  payloadAfter?: Prisma.InputJsonValue;
}

type Db = Pick<PrismaService, 'auditLog'>;

// Mọi bản ghi audit đi qua đây để tự gắn IP / User-Agent / fingerprint / actor
// của request hiện tại (AsyncLocalStorage). Gọi trong transaction thì truyền `tx`
// để bản ghi commit/rollback cùng nghiệp vụ.
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(entry: AuditEntry, tx?: Db): Promise<void> {
    const ctx = auditStorage.getStore();
    if (ctx) ctx.written = true;
    const db: Db = tx ?? this.prisma;

    await db.auditLog.create({
      data: {
        actorId: entry.actorId !== undefined ? entry.actorId : (ctx?.actorId ?? null),
        actorRole: entry.actorRole !== undefined ? entry.actorRole : (ctx?.actorRole ?? null),
        targetResource: entry.targetResource,
        actionType: entry.actionType,
        level: entry.level ?? AuditLevel.INFO,
        method: ctx?.method ?? null,
        path: ctx?.path ?? null,
        statusCode: entry.statusCode ?? null,
        payloadBefore: entry.payloadBefore,
        payloadAfter: entry.payloadAfter,
        requestPayload: (ctx?.requestPayload as Prisma.InputJsonValue | undefined) ?? undefined,
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
        deviceFingerprint: ctx?.deviceFingerprint ?? null,
      },
    });
  }

  // P6-12 — đăng nhập từ IP chưa từng dùng của một tài khoản đã có lịch sử đăng
  // nhập → CRITICAL (nghi chiếm tài khoản). Lần đăng nhập đầu tiên không cảnh báo.
  async recordLogin(userId: string, actorRole: string): Promise<void> {
    const ip = auditStorage.getStore()?.ip ?? null;
    const successfulLogin = { actorId: userId, actionType: AuditActionType.LOGIN, statusCode: 201 };
    const [hadLoginBefore, seenThisIp] = await Promise.all([
      this.prisma.auditLog.count({ where: successfulLogin }),
      ip ? this.prisma.auditLog.count({ where: { ...successfulLogin, ip } }) : Promise.resolve(1),
    ]);
    const unknownIp = hadLoginBefore > 0 && seenThisIp === 0;

    await this.write({
      actionType: AuditActionType.LOGIN,
      targetResource: `user:${userId}`,
      level: unknownIp ? AuditLevel.CRITICAL : AuditLevel.INFO,
      actorId: userId,
      actorRole,
      statusCode: 201,
      payloadAfter: { unknownIp },
    });
  }
}
