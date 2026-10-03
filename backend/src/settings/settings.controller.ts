import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { UpdateSepaySettingsDto } from './dto/update-sepay-settings.dto.js';
import { UpdateActivationFeeDto } from './dto/update-activation-fee.dto.js';
import { UserRole } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';

// CMS "Cài Đặt" (menu mẹ) → "Cài đặt SePay" — chỉ Admin/Root Admin, mọi route
// đều ghi đè cấu hình vận hành dùng chung toàn hệ thống (bank nhận tiền,
// webhook API key) nên không mở cho Moderator.
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('sepay')
  @Roles(UserRole.ADMIN, UserRole.ROOT_ADMIN)
  getSepay() {
    return this.settings.getSepaySettings();
  }

  @Put('sepay')
  @Roles(UserRole.ADMIN, UserRole.ROOT_ADMIN)
  updateSepay(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdateSepaySettingsDto) {
    return this.settings.updateSepaySettings(user.sub, dto);
  }

  @Get('activation-fee')
  @Roles(UserRole.ADMIN, UserRole.ROOT_ADMIN)
  getActivationFee() {
    return this.settings.getActivationFee();
  }

  @Put('activation-fee')
  @Roles(UserRole.ADMIN, UserRole.ROOT_ADMIN)
  updateActivationFee(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateActivationFeeDto,
  ) {
    return this.settings.updateActivationFee(user.sub, dto);
  }
}
