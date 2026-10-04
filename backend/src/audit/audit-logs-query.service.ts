import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ListAuditLogsQuery } from './dto/list-audit-logs.query.js';

const LIST_SELECT = {
  id: true,
  createdAt: true,
  actorRole: true,
  targetResource: true,
  actionType: true,
  level: true,
  method: true,
  path: true,
  statusCode: true,
  ip: true,
  userAgent: true,
  deviceFingerprint: true,
  actor: { select: { id: true, email: true } },
} satisfies Prisma.AuditLogSelect;

@Injectable()
export class AuditLogsQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListAuditLogsQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.AuditLogWhereInput = {
      ...(query.actor ? { actor: { email: { contains: query.actor, mode: 'insensitive' } } } : {}),
      ...(query.role ? { actorRole: query.role } : {}),
      ...(query.action ? { actionType: query.action } : {}),
      ...(query.level ? { level: query.level } : {}),
      ...(query.ip ? { ip: { contains: query.ip } } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        select: LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async getOne(id: string) {
    const row = await this.prisma.auditLog.findUnique({
      where: { id },
      select: {
        ...LIST_SELECT,
        payloadBefore: true,
        payloadAfter: true,
        requestPayload: true,
      },
    });
    if (!row) throw new NotFoundException('Không tìm thấy bản ghi audit');
    return row;
  }
}
