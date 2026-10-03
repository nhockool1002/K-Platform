import { Body, Controller, ForbiddenException, Post, UseGuards } from '@nestjs/common';
import { DisputesService } from './disputes.service.js';
import { CreateDisputeDto } from './dto/create-dispute.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';

@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  // FN-DISP-01 — chỉ Bên B (activeMode B) được tạo Dispute cho bài nộp của mình.
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateDisputeDto) {
    if (user.activeMode !== 'B') {
      throw new ForbiddenException('Chỉ Tài khoản người dùng (Bên B) mới được tạo Dispute');
    }
    return this.disputes.create(user.sub, dto);
  }
}
