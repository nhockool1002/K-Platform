import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { SepayConfigService } from './sepay-config.service.js';
import { ActivationFeeConfigService } from './activation-fee-config.service.js';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SepayConfigService, ActivationFeeConfigService],
  exports: [SepayConfigService, ActivationFeeConfigService],
})
export class SettingsModule {}
