import { Module } from '@nestjs/common';
import { AccountActivationController } from './account-activation.controller.js';
import { AccountActivationService } from './account-activation.service.js';
import { SettingsModule } from '../settings/settings.module.js';

@Module({
  imports: [SettingsModule],
  controllers: [AccountActivationController],
  providers: [AccountActivationService],
  exports: [AccountActivationService],
})
export class AccountActivationModule {}
