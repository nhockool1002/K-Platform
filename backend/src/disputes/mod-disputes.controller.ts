import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { DisputesService } from './disputes.service.js';
import { RecommendDisputeDto } from './dto/recommend-dispute.dto.js';
import { DisputeStatus, UserRole } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';

// SCR-11 CMS Dispute Center — xem bằng chứng 2 bên + đề xuất (FN-DISP-02).
// Moderator/Admin/Root Admin đều xem được; chỉ Moderator/Admin/Root Admin đề
// xuất được (P5-06 — guard chặn duyệt chi trực tiếp nằm ở admin-disputes.controller.ts).
@Controller('mod/disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MODERATOR, UserRole.ADMIN, UserRole.ROOT_ADMIN)
export class ModDisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Get()
  list(@Query('status') status?: string) {
    const normalized = status && status in DisputeStatus ? (status as DisputeStatus) : undefined;
    return this.disputes.list(normalized);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.disputes.getOne(id);
  }

  @Put(':id/recommend')
  recommend(
    @CurrentUser() mod: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: RecommendDisputeDto,
  ) {
    return this.disputes.recommend(mod.sub, mod.role, id, dto);
  }
}
