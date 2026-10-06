import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WatermarkProcessor } from './watermark.processor.js';
import { WATERMARK_QUEUE } from './watermark.constants.js';

// Queue riêng cho job chèn Watermark (P4-04) — đăng ký ở đây, kết nối Redis
// (BullModule.forRootAsync) cấu hình 1 lần ở AppModule.
@Module({
  imports: [BullModule.registerQueue({ name: WATERMARK_QUEUE })],
  providers: [WatermarkProcessor],
  exports: [BullModule],
})
export class WatermarkModule {}
