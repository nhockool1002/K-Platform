import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { UpdateSepaySettingsDto } from './dto/update-sepay-settings.dto.js';
import { UpdateActivationFeeDto } from './dto/update-activation-fee.dto.js';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto.js';
import { UpdateInternationalPaymentDto } from './dto/update-international-payment.dto.js';
import { UpdateDisputeSlaDto } from './dto/update-dispute-sla.dto.js';
import { AuditLevel } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/permissions.guard.js';
import { RequirePermission } from '../rbac/require-permission.decorator.js';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';
import { Audit } from '../audit/audit.decorator.js';

// CMS "Cài Đặt" (menu mẹ) → mọi route đều ghi đè cấu hình vận hành dùng
// chung toàn hệ thống nên chỉ Admin/Root Admin, không mở cho Moderator.
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @RequirePermission(['settings', 'READ'])
  @Get('sepay')
  getSepay() {
    return this.settings.getSepaySettings();
  }

  @Audit({ level: AuditLevel.WARNING })
  @RequirePermission(['settings', 'UPDATE'])
  @Put('sepay')
  updateSepay(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdateSepaySettingsDto) {
    return this.settings.updateSepaySettings(user.sub, dto);
  }

  @RequirePermission(['settings', 'READ'])
  @Get('activation-fee')
  getActivationFee() {
    return this.settings.getActivationFee();
  }

  @Audit({ level: AuditLevel.WARNING })
  @RequirePermission(['settings', 'UPDATE'])
  @Put('activation-fee')
  updateActivationFee(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateActivationFeeDto,
  ) {
    return this.settings.updateActivationFee(user.sub, dto);
  }

  // B-02 — tab "Cài đặt thanh toán Quốc tế" (chuẩn bị trước cho BMC, Phase 6).
  @RequirePermission(['settings', 'READ'])
  @Get('international-payment')
  getInternationalPayment() {
    return this.settings.getInternationalPaymentSettings();
  }

  @Audit({ level: AuditLevel.WARNING })
  @RequirePermission(['settings', 'UPDATE'])
  @Put('international-payment/exchange-rate')
  updateExchangeRate(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdateExchangeRateDto) {
    return this.settings.updateExchangeRate(user.sub, dto);
  }

  @Audit({ level: AuditLevel.WARNING })
  @RequirePermission(['settings', 'UPDATE'])
  @Put('international-payment/review-days')
  updateReviewDays(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateInternationalPaymentDto,
  ) {
    return this.settings.updateReviewDays(user.sub, dto);
  }

  @RequirePermission(['settings', 'READ'])
  @Get('international-payment/exchange-rate/history')
  getExchangeRateHistory() {
    return this.settings.getExchangeRateHistory();
  }

  // B-03/B-04 — Modal "Cài đặt SLA" trong màn CMS Dispute Center.
  @RequirePermission(['settings', 'READ'])
  @Get('dispute-sla')
  getDisputeSla() {
    return this.settings.getDisputeSla();
  }

  @Audit({ level: AuditLevel.WARNING })
  @RequirePermission(['settings', 'UPDATE'])
  @Put('dispute-sla')
  updateDisputeSla(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdateDisputeSlaDto) {
    return this.settings.updateDisputeSla(user.sub, dto);
  }
}
