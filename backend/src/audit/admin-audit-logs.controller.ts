import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditLogsQueryService } from './audit-logs-query.service.js';
import { ListAuditLogsQuery } from './dto/list-audit-logs.query.js';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/permissions.guard.js';
import { RequirePermission } from '../rbac/require-permission.decorator.js';

// SCR-13 — tra cứu Audit Logs: chỉ Admin/Root Admin (đúng bảng RBAC SRS).
@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminAuditLogsController {
  constructor(private readonly logs: AuditLogsQueryService) {}

  @RequirePermission(['audit_logs', 'READ'])
  @Get()
  list(@Query() query: ListAuditLogsQuery) {
    return this.logs.list(query);
  }

  @RequirePermission(['audit_logs', 'READ'])
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.logs.getOne(id);
  }
}
