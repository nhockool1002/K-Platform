import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CmsOpsService } from './cms-ops.service.js';
import { AuditLevel } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/permissions.guard.js';
import { RequirePermission } from '../rbac/require-permission.decorator.js';
import { Audit } from '../audit/audit.decorator.js';

// SCR-25 — trạng thái hàng đợi watermark, Auto-Approve kẹt, lỗi 5xx gần đây.
@Controller('admin/ops')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminOpsController {
  constructor(private readonly ops: CmsOpsService) {}

  @RequirePermission(['system_ops', 'READ'])
  @Get('status')
  status() {
    return this.ops.opsStatus();
  }

  @Audit({ level: AuditLevel.WARNING })
  @RequirePermission(['system_ops', 'UPDATE'])
  @Post('watermark/retry-failed')
  retryFailed() {
    return this.ops.retryFailedWatermarkJobs();
  }
}
