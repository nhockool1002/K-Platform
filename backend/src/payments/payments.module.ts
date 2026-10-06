import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.js';
import { AdminWithdrawalsController } from './admin-withdrawals.controller.js';
import { PaymentsService } from './payments.service.js';
import { SepayWebhookGuard } from './guards/sepay-webhook.guard.js';
import { SettingsModule } from '../settings/settings.module.js';
import { InternationalPaymentsController } from './international-payments.controller.js';
import { AdminInternationalPaymentsController } from './admin-international-payments.controller.js';
import { InternationalPaymentsService } from './international-payments.service.js';
import { InternationalPackagesService } from './international-packages.service.js';

@Module({
  imports: [SettingsModule],
  controllers: [
    PaymentsController,
    AdminWithdrawalsController,
    InternationalPaymentsController,
    AdminInternationalPaymentsController,
  ],
  providers: [
    PaymentsService,
    SepayWebhookGuard,
    InternationalPaymentsService,
    InternationalPackagesService,
  ],
})
export class PaymentsModule {}
