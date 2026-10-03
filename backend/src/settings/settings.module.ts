import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { SepayConfigService } from './sepay-config.service.js';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SepayConfigService],
  exports: [SepayConfigService],
})
export class SettingsModule {}
