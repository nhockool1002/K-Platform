import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TrustScoreService } from './trust-score.service.js';
import { AdjustTrustScoreDto } from './dto/adjust-trust-score.dto.js';
import { UserRole, AuditActionType, AuditLevel } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { RootAdminTargetGuard } from '../common/guards/root-admin-target.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';
import { Audit } from '../audit/audit.decorator.js';

// B-05/CMS Quản Trị Tài Khoản — Admin +/- Trust Score trực tiếp cho 1 tài
// khoản bất kỳ + xem lịch sử. RootAdminTargetGuard chặn thao tác lên Root
// Admin (giữ nguyên quy tắc "không ai được đụng tới Root" từ Phase 1).
@Controller('admin/trust-score')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ROOT_ADMIN)
export class AdminTrustScoreController {
  constructor(private readonly trustScore: TrustScoreService) {}

  @Get('leaderboard')
  leaderboard(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : 10;
    return this.trustScore.getLeaderboard(Number.isFinite(parsed) && parsed > 0 ? parsed : 10);
  }

  @Get(':id/history')
  history(@Param('id') id: string) {
    return this.trustScore.getHistory(id);
  }

  @Audit({ action: AuditActionType.MANUAL_TOPUP, level: AuditLevel.CRITICAL })
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
