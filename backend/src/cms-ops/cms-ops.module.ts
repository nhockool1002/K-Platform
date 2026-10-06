import { Module } from '@nestjs/common';
import { WatermarkModule } from '../watermark/watermark.module.js';
import { CmsOpsService } from './cms-ops.service.js';
import { AdminWalletsController } from './admin-wallets.controller.js';
import { AdminFraudController } from './admin-fraud.controller.js';
import { AdminOpsController } from './admin-ops.controller.js';

// CMS SCR-23 (Ví & sổ cái), SCR-24 (Chống gian lận), SCR-25 (Giám sát vận hành).
// WatermarkModule cung cấp queue watermark cho màn giám sát.
@Module({
  imports: [WatermarkModule],
  controllers: [AdminWalletsController, AdminFraudController, AdminOpsController],
  providers: [CmsOpsService],
})
export class CmsOpsModule {}
