import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { SepayWebhookGuard } from './guards/sepay-webhook.guard.js';
import { SettingsModule } from '../settings/settings.module.js';

@Module({
  imports: [SettingsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, SepayWebhookGuard],
})
export class PaymentsModule {}
