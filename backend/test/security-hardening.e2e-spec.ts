import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Hồi quy các lỗ hổng từ QA P8-01/P8-02: upload giả mạo (stored XSS), thiếu header
// bảo mật, lộ X-Powered-By, không có rate-limit đăng nhập.
describe('Bảo mật — upload, header, rate-limit (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const userEmail = `e2e-sec-user-${suffix}@kplatform.dev`;
  const password = randomBytes(12).toString('hex');
  let token: string;
  let realPng: Buffer;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    app.disable('x-powered-by');
    await app.init();
    prisma = app.get(PrismaService);

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { email: userEmail, passwordHash, activeMode: 'A', role: 'USER' },
    });
    await prisma.wallet.create({ data: { user: { connect: { email: userEmail } } } });
    realPng = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#1d4e89' } })
      .png()
      .toBuffer();
    token = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: userEmail, password })
        .expect(200)
    ).body.accessToken as string;
  });

  afterAll(async () => {
    await prisma.wallet.deleteMany({ where: { user: { email: userEmail } } });
    await prisma.user.deleteMany({ where: { email: userEmail } });
    await app.close();
  });

  it('Avatar: file HTML đội lốt image/png bị từ chối 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/profile/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('<script>alert(1)</script>'), {
        filename: 'evil.html',
        contentType: 'image/png',
      })
      .expect(400);
  });

  it('Avatar: ảnh thật đặt tên .html vẫn được lưu với đuôi theo nội dung (.png), không phải .html', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/v1/profile/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', realPng, { filename: 'photo.html', contentType: 'image/png' })
      .expect(201);
    expect(body.avatarUrl).toMatch(/\.png$/);
  });

  it('Proof: MIME không được phép (text/html, image/svg+xml) bị từ chối', async () => {
    const reject = (mime: string) =>
      request(app.getHttpServer())
        .post('/api/v1/submissions/00000000-0000-4000-8000-000000000001/proof')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('<svg onload=alert(1)>'), {
          filename: 'x.svg',
          contentType: mime,
        });
    const htmlRes = await reject('text/html');
    const svgRes = await reject('image/svg+xml');
    expect(htmlRes.status).toBeGreaterThanOrEqual(400);
    expect(svgRes.status).toBeGreaterThanOrEqual(400);
    expect([400, 403, 404]).toContain(htmlRes.status);
  });

  it('Header bảo mật có mặt và không lộ X-Powered-By', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['strict-transport-security']).toContain('max-age=');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('Rate-limit đăng nhập: vượt 20 lần/10 phút cho cùng IP + email trả 429', async () => {
    const email = `e2e-sec-brute-${suffix}@kplatform.dev`;
    const attempts = await Promise.all(
      Array.from({ length: 25 }, () =>
        request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email, password: 'wrong-password-xx' }),
      ),
    );
    const statuses = attempts.map((r) => r.status);
    expect(statuses.filter((s) => s === 401).length).toBeLessThanOrEqual(20);
    expect(statuses).toContain(429);
    const limited = attempts.find((r) => r.status === 429);
    expect(limited?.body.message).toContain('thử lại sau');
  });
});
