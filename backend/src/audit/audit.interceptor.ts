import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { Observable, from, mergeMap } from 'rxjs';
import { AuditActionType, AuditLevel, type Prisma } from '../prisma/client.js';
import { AUDIT_KEY, type AuditMeta } from './audit.decorator.js';
import { AuditService } from './audit.service.js';
import { auditStorage } from './audit-context.js';
import { buildAuditContext } from './audit-request-context.js';
import { sanitizeForAudit } from './audit-sanitize.js';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const DEFAULT_ACTION: Record<string, AuditActionType> = {
  POST: AuditActionType.CREATE,
  PUT: AuditActionType.UPDATE,
  PATCH: AuditActionType.UPDATE,
  DELETE: AuditActionType.DELETE,
};

// P6-08 — ghi audit cho mọi mutation HTTP thành công. Request lỗi (kể cả bị guard
// từ chối) do AuditExceptionFilter ghi. Service nào tự ghi bản chi tiết
// (AuditService.write) thì đã đánh dấu `written`, không ghi trùng.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    if (!MUTATING.has(req.method)) return next.handle();

    const meta = this.reflector.get<AuditMeta | undefined>(AUDIT_KEY, context.getHandler());
    if (meta?.skip) return next.handle();

    const res = context.switchToHttp().getResponse<Response>();
    const ctx = buildAuditContext(req);
    const action = meta?.action ?? DEFAULT_ACTION[req.method] ?? AuditActionType.UPDATE;

    const handled$ = new Observable<unknown>((subscriber) =>
      auditStorage.run(ctx, () => next.handle().subscribe(subscriber)),
    );

    return handled$.pipe(
      mergeMap((data) =>
        from(
          auditStorage.run(ctx, async () => {
            if (!ctx.written) {
              await this.audit.write({
                actionType: action,
                targetResource: `${req.method} ${ctx.path}`,
                level: meta?.level ?? AuditLevel.INFO,
                statusCode: res.statusCode,
                payloadAfter: sanitizeForAudit(data) as Prisma.InputJsonValue,
              });
            }
            return data;
          }),
        ),
      ),
    );
  }
}
