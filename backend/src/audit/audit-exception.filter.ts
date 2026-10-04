import { ArgumentsHost, Catch, HttpException, Injectable, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request } from 'express';
import { AuditActionType, AuditLevel } from '../prisma/client.js';
import { AuditService } from './audit.service.js';
import { auditStorage } from './audit-context.js';
import { buildAuditContext } from './audit-request-context.js';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// P6-15 — request mutation bị từ chối/lỗi (kể cả 401/403 từ guard, chạy trước
// interceptor) vẫn để lại dấu vết. Ghi xong vẫn trả nguyên response lỗi cũ.
@Catch()
@Injectable()
export class AuditExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AuditExceptionFilter.name);

  constructor(private readonly audit: AuditService) {
    super();
  }

  override async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    if (host.getType() === 'http') {
      const req = host.switchToHttp().getRequest<Request>();
      if (req && MUTATING.has(req.method)) {
        const status = exception instanceof HttpException ? exception.getStatus() : 500;
        const ctx = buildAuditContext(req);
        try {
          await auditStorage.run(ctx, () =>
            this.audit.write({
              actionType: this.actionFor(req.method),
              targetResource: `${req.method} ${ctx.path}`,
              level: AuditLevel.WARNING,
              statusCode: status,
              payloadAfter: { error: exception instanceof Error ? exception.message : 'unknown' },
            }),
          );
        } catch (writeErr) {
          this.logger.error(`Không ghi được audit cho request lỗi: ${String(writeErr)}`);
        }
      }
    }
    super.catch(exception, host);
  }

  private actionFor(method: string): AuditActionType {
    if (method === 'DELETE') return AuditActionType.DELETE;
    if (method === 'POST') return AuditActionType.CREATE;
    return AuditActionType.UPDATE;
  }
}
