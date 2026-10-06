import { Module } from '@nestjs/common';
import { SubmissionsController } from './submissions.controller.js';
import { AdminSubmissionsController } from './admin-submissions.controller.js';
import { SubmissionsService } from './submissions.service.js';
import { AutoApproveService } from './auto-approve.service.js';
import { WatermarkModule } from '../watermark/watermark.module.js';
import { TrustScoreModule } from '../trust-score/trust-score.module.js';
import { ensureUploadDirs } from './upload-paths.js';

@Module({
  imports: [WatermarkModule, TrustScoreModule],
  controllers: [SubmissionsController, AdminSubmissionsController],
  providers: [SubmissionsService, AutoApproveService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {
  // `main.ts`'s bootstrap() chỉ chạy khi start app thật — test e2e tự dựng
  // Nest app qua TestingModule nên không bao giờ gọi tới. Đặt ở đây để luôn
  // chạy bất kể app khởi tạo theo đường nào.
  constructor() {
    ensureUploadDirs();
  }
}
