import { Module } from '@nestjs/common';
import { DisputesController } from './disputes.controller.js';
import { ModDisputesController } from './mod-disputes.controller.js';
import { AdminDisputesController } from './admin-disputes.controller.js';
import { DisputesService } from './disputes.service.js';
import { SubmissionsModule } from '../submissions/submissions.module.js';

@Module({
  imports: [SubmissionsModule],
  controllers: [DisputesController, ModDisputesController, AdminDisputesController],
  providers: [DisputesService],
})
export class DisputesModule {}
