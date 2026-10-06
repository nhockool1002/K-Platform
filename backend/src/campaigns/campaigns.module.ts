import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller.js';
import { AdminCampaignsController } from './admin-campaigns.controller.js';
import { CampaignsService } from './campaigns.service.js';

@Module({
  controllers: [CampaignsController, AdminCampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
