import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { UPLOADS_ROOT, ensureUploadDirs } from './submissions/upload-paths.js';

async function bootstrap() {
  ensureUploadDirs();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Sau nginx của aaPanel: đọc IP client thật từ X-Forwarded-For (P6-09).
  app.set('trust proxy', 1);
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  // P4-02/P4-03 — ảnh/video Proof gốc + sau khi chèn Watermark, phục vụ tĩnh
  // qua /uploads/* (xem DEPLOY.md về volume Docker để không mất file khi deploy).
  app.useStaticAssets(UPLOADS_ROOT, { prefix: '/uploads' });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
