import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { SepayWebhookGuard } from './guards/sepay-webhook.guard.js';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, SepayWebhookGuard],
})
export class PaymentsModule {}
