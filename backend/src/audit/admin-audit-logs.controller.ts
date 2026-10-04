import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditLogsQueryService } from './audit-logs-query.service.js';
import { ListAuditLogsQuery } from './dto/list-audit-logs.query.js';
import { UserRole } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

// SCR-13 — tra cứu Audit Logs: chỉ Admin/Root Admin (đúng bảng RBAC SRS).
@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ROOT_ADMIN)
export class AdminAuditLogsController {
  constructor(private readonly logs: AuditLogsQueryService) {}

  @Get()
  list(@Query() query: ListAuditLogsQuery) {
    return this.logs.list(query);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.logs.getOne(id);
  }
}
