import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditExceptionFilter } from './audit-exception.filter.js';
import { AuditService } from './audit.service.js';
import { AuditInterceptor } from './audit.interceptor.js';
import { AdminAuditLogsController } from './admin-audit-logs.controller.js';
import { AuditLogsQueryService } from './audit-logs-query.service.js';

@Global()
@Module({
  controllers: [AdminAuditLogsController],
  providers: [
    AuditService,
    AuditLogsQueryService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_FILTER, useClass: AuditExceptionFilter },
  ],
  exports: [AuditService],
})
export class AuditModule {}
