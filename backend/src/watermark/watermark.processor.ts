import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { PrismaService } from '../prisma/prisma.service.js';
import { WATERMARK_QUEUE } from './watermark.constants.js';

export interface WatermarkJobData {
  submissionId: string;
  inputPath: string;
  outputPath: string;
  kind: 'image' | 'video';
  watermarkText: string;
}

// Font cài qua apk package `font-dejavu` (xem backend/Dockerfile) — ffmpeg
// drawtext cần fontfile tường minh, không dựa vào fontconfig lookup theo tên.
// Override qua env khi chạy ngoài Docker (vd. macOS dev không có đường dẫn
// Alpine này) — xem backend/.env.example.
const VIDEO_FONT_PATH =
  process.env.WATERMARK_FONT_PATH ?? '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf';

function escapeDrawtext(text: string): string {
  // ffmpeg filter syntax dùng `:` làm separator và `'` để quote — escape cả
  // 2 ký tự này (cộng `\`) để watermarkText (có thể chứa UserID dạng UUID,
  // không có ký tự đặc biệt, nhưng escape đầy đủ cho an toàn).
  return text.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

// P4-05/P4-06 (FN-TASK-01) — chèn Watermark UserID + CampaignID lên ảnh/video
// Proof, chạy bất đồng bộ qua BullMQ (P4-04) để không chặn request upload.
@Processor(WATERMARK_QUEUE)
export class WatermarkProcessor extends WorkerHost {
  private readonly logger = new Logger(WatermarkProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<WatermarkJobData>): Promise<void> {
    const { submissionId, inputPath, outputPath, kind, watermarkText } = job.data;

    if (kind === 'image') {
      await this.watermarkImage(inputPath, outputPath, watermarkText);
    } else {
      await this.watermarkVideo(inputPath, outputPath, watermarkText);
    }

    const publicPath = `/uploads/watermarked/${outputPath.split('/').pop()}`;
    await this.prisma.submission.update({
      where: { id: submissionId },
      data: { watermarkUrl: publicPath },
    });
  }

  private async watermarkImage(input: string, output: string, text: string): Promise<void> {
    const image = sharp(input);
    const { width = 800, height = 600 } = await image.metadata();
    const barHeight = Math.max(32, Math.round(height * 0.06));
    const fontSize = Math.max(14, Math.round(barHeight * 0.5));
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="${height - barHeight}" width="${width}" height="${barHeight}" fill="black" fill-opacity="0.55" />
      <text x="12" y="${height - barHeight / 2 + fontSize / 3}" font-family="sans-serif" font-size="${fontSize}" fill="white" fill-opacity="0.9">${escaped}</text>
    </svg>`;

    await image.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).toFile(output);
  }

  private watermarkVideo(input: string, output: string, text: string): Promise<void> {
    const drawtext =
      `drawtext=fontfile=${VIDEO_FONT_PATH}:text='${escapeDrawtext(text)}':` +
      `fontcolor=white:fontsize=20:box=1:boxcolor=black@0.55:boxborderw=6:x=10:y=h-th-10`;

    return new Promise((resolve, reject) => {
      ffmpeg(input)
        .videoFilters(drawtext)
        .outputOptions(['-codec:a', 'copy'])
        .on('end', () => resolve())
        .on('error', (err: Error) => {
          this.logger.error(`Watermark video thất bại (${input}): ${err.message}`);
          reject(err);
        })
        .save(output);
    });
  }
}
