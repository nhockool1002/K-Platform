import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { SepayConfigService } from './sepay-config.service.js';
import { ActivationFeeConfigService } from './activation-fee-config.service.js';
import { ExchangeRateConfigService } from './exchange-rate-config.service.js';
import { DisputeSlaConfigService } from './dispute-sla-config.service.js';

@Module({
  controllers: [SettingsController],
  providers: [
    SettingsService,
    SepayConfigService,
    ActivationFeeConfigService,
    ExchangeRateConfigService,
    DisputeSlaConfigService,
  ],
  exports: [
    SepayConfigService,
    ActivationFeeConfigService,
    ExchangeRateConfigService,
    DisputeSlaConfigService,
  ],
})
export class SettingsModule {}
