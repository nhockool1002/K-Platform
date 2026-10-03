import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AccountActivationService } from './account-activation.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';

@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountActivationController {
  constructor(private readonly activation: AccountActivationService) {}

  @Get('activation-status')
  getStatus(@CurrentUser() user: AccessTokenPayload) {
    return this.activation.getStatus(user.sub);
  }

  @Post('activate')
  @HttpCode(200)
  activate(@CurrentUser() user: AccessTokenPayload) {
    return this.activation.activate(user.sub);
  }
}
