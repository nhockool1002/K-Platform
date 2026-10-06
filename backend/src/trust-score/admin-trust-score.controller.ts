import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TrustScoreService } from './trust-score.service.js';
import { AdjustTrustScoreDto } from './dto/adjust-trust-score.dto.js';
import { AuditActionType, AuditLevel } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/permissions.guard.js';
import { RequirePermission } from '../rbac/require-permission.decorator.js';
import { RootAdminTargetGuard } from '../common/guards/root-admin-target.guard.js';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';
import { Audit } from '../audit/audit.decorator.js';

// B-05/CMS Quản Trị Tài Khoản — Admin +/- Trust Score trực tiếp cho 1 tài
// khoản bất kỳ + xem lịch sử. RootAdminTargetGuard chặn thao tác lên Root
// Admin (giữ nguyên quy tắc "không ai được đụng tới Root" từ Phase 1).
@Controller('admin/trust-score')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminTrustScoreController {
  constructor(private readonly trustScore: TrustScoreService) {}

  @RequirePermission(['trust_score', 'READ'])
  @Get('leaderboard')
  leaderboard(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : 10;
    return this.trustScore.getLeaderboard(Number.isFinite(parsed) && parsed > 0 ? parsed : 10);
  }

  @RequirePermission(['trust_score', 'READ'])
  @Get(':id/history')
  history(@Param('id') id: string) {
    return this.trustScore.getHistory(id);
  }

  @Audit({ action: AuditActionType.MANUAL_TOPUP, level: AuditLevel.CRITICAL })
  @RequirePermission(['trust_score', 'UPDATE'])
  @Post(':id/adjust')
  @UseGuards(RootAdminTargetGuard)
  adjust(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: AdjustTrustScoreDto,
  ) {
    return this.trustScore.manualAdjust(actor.sub, id, dto.delta, dto.ruleCode, dto.note);
  }
}
