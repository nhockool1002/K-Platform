import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { SwitchModeDto } from './dto/switch-mode.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from './token.types.js';
import { Audit } from '../audit/audit.decorator.js';
import { AuditActionType } from '../prisma/client.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Audit({ action: AuditActionType.LOGIN })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AccessTokenPayload) {
    return this.auth.me(user.sub);
  }

  // FN-AUTH-01 — đổi context Bên A/Bên B mà không mất phiên đăng nhập.
  @UseGuards(JwtAuthGuard)
  @Post('switch-mode')
  @HttpCode(HttpStatus.OK)
  switchMode(@CurrentUser() user: AccessTokenPayload, @Body() dto: SwitchModeDto) {
    return this.auth.switchMode(user.sub, dto);
  }

  // P1-04/P1-05 — mockup: OAuth Google/Facebook sẽ triển khai đầy đủ ở phase sau.
  @Post('oauth/google')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  oauthGoogleMock() {
    return {
      status: 'not_implemented',
      message: 'Đăng nhập Google đang được phát triển — dự kiến ở phase kế tiếp.',
    };
  }

  @Post('oauth/facebook')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  oauthFacebookMock() {
    return {
      status: 'not_implemented',
      message: 'Đăng nhập Facebook đang được phát triển — dự kiến ở phase kế tiếp.',
    };
  }
}
