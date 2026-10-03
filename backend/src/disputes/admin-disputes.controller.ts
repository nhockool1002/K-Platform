import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { DisputesService } from './disputes.service.js';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto.js';
import { UserRole } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';

// FN-DISP-03 — phán quyết cuối cùng. CHỈ Admin/Root Admin — Moderator không
// được gọi route này dù đã đề xuất trước đó (P5-06/P5-12).
@Controller('admin/disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ROOT_ADMIN)
export class AdminDisputesController {
  constructor(private readonly disputes: DisputesService) {}

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
