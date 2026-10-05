import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { DisputesService } from './disputes.service.js';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto.js';
import { AuditActionType, AuditLevel } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/permissions.guard.js';
import { RequirePermission } from '../rbac/require-permission.decorator.js';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';
import { Audit } from '../audit/audit.decorator.js';

// FN-DISP-03 — phán quyết cuối cùng. CHỈ Admin/Root Admin — Moderator không
// được gọi route này dù đã đề xuất trước đó (P5-06/P5-12).
@Controller('admin/disputes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminDisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Audit({ action: AuditActionType.DISPUTE_RESOLVE, level: AuditLevel.CRITICAL })
  @RequirePermission(['disputes', 'APPROVE'])
  @Post(':id/resolve')
  @HttpCode(200)
  resolve(
    @CurrentUser() admin: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputes.resolve(admin.sub, id, dto);
  }
}
