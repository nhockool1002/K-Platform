import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CmsOpsService } from './cms-ops.service.js';
import { SetUserDisabledDto } from './dto/cms-ops.dto.js';
import { AuditLevel } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/permissions.guard.js';
import { RequirePermission } from '../rbac/require-permission.decorator.js';
import { Audit } from '../audit/audit.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';

// SCR-24 — phát hiện cụm nhiều tài khoản cùng fingerprint/IP trong 1 Campaign.
@Controller('admin/fraud')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminFraudController {
  constructor(private readonly ops: CmsOpsService) {}

  @RequirePermission(['fraud', 'READ'])
  @Get('clusters')
  clusters() {
    return this.ops.fraudClusters();
  }

  @Audit({ level: AuditLevel.CRITICAL })
  @RequirePermission(['fraud', 'UPDATE'])
  @Patch('users/:userId/disabled')
  setDisabled(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('userId') userId: string,
    @Body() dto: SetUserDisabledDto,
  ) {
    return this.ops.setUserDisabled(actor.sub, userId, dto.disabled);
  }
}
