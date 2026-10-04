import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// B-02 — CMS "Cài đặt thanh toán" tab Quốc tế (tỷ giá USD→VNĐ + lịch sử).
// B-03/B-04 — CMS SLA Dispute (Moderator/Admin hours).
describe('Settings — Thanh toán Quốc tế & SLA Dispute (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const adminEmail = `e2e-pay-sla-admin-${suffix}@kplatform.dev`;
  const userEmail = `e2e-pay-sla-user-${suffix}@kplatform.dev`;
  const password = randomBytes(12).toString('hex');

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { email: adminEmail, passwordHash, activeMode: 'A', role: 'ADMIN' },
    });
    await prisma.user.create({
      data: { email: userEmail, passwordHash, activeMode: 'A', role: 'USER' },
    });
  });

  afterAll(async () => {
    await prisma.exchangeRateHistory.deleteMany({ where: { updatedBy: { email: adminEmail } } });
    await prisma.systemSetting.deleteMany({
      where: { key: { in: ['international_payment', 'dispute_sla'] } },
    });
    await prisma.user.deleteMany({ where: { email: { in: [adminEmail, userEmail] } } });
    await app.close();
  });

  async function loginAs(email: string): Promise<string> {
    const { body } = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return body.accessToken as string;
  }

  it('USER thường bị chặn 403 trên mọi route cài đặt mới', async () => {
    const userToken = await loginAs(userEmail);
    await request(app.getHttpServer())
      .get('/api/v1/admin/settings/international-payment')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/admin/settings/dispute-sla')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('Tỷ giá mặc định 26.300 VNĐ/USD và SLA mặc định 12h/24h khi chưa cấu hình', async () => {
    const adminToken = await loginAs(adminEmail);

    const { body: payment } = await request(app.getHttpServer())
      .get('/api/v1/admin/settings/international-payment')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(payment.usdToVnd).toBe(26_300);
    expect(payment.reviewDays).toBe(7);

    const { body: sla } = await request(app.getHttpServer())
      .get('/api/v1/admin/settings/dispute-sla')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(sla.moderatorHours).toBe(12);
    expect(sla.adminHours).toBe(24);
  });

  it('Đổi tỷ giá tạo dòng lịch sử mới (append-only), không sửa dòng cũ', async () => {
    const adminToken = await loginAs(adminEmail);

    await request(app.getHttpServer())
      .put('/api/v1/admin/settings/international-payment/exchange-rate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ usdToVnd: 26_500 })
      .expect(200);

    const { body: updated } = await request(app.getHttpServer())
      .get('/api/v1/admin/settings/international-payment')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(updated.usdToVnd).toBe(26_500);

    await request(app.getHttpServer())
      .put('/api/v1/admin/settings/international-payment/exchange-rate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ usdToVnd: 26_800 })
      .expect(200);

    const { body: history } = await request(app.getHttpServer())
      .get('/api/v1/admin/settings/international-payment/exchange-rate/history')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].usdToVnd).toBe(26_800); // mới nhất trước
    expect(history.some((h: { usdToVnd: number }) => h.usdToVnd === 26_500)).toBe(true);
  });

  it('Đổi reviewDays lưu đúng, validate từ chối giá trị <= 0', async () => {
    const adminToken = await loginAs(adminEmail);

    await request(app.getHttpServer())
      .put('/api/v1/admin/settings/international-payment/review-days')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reviewDays: 0 })
      .expect(400);

    const { body: updated } = await request(app.getHttpServer())
      .put('/api/v1/admin/settings/international-payment/review-days')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reviewDays: 10 })
      .expect(200);
    expect(updated.reviewDays).toBe(10);
  });

  it('Đổi SLA Dispute lưu đúng, validate từ chối giá trị <= 0', async () => {
    const adminToken = await loginAs(adminEmail);

    await request(app.getHttpServer())
      .put('/api/v1/admin/settings/dispute-sla')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ moderatorHours: 0, adminHours: 24 })
      .expect(400);

    const { body: updated } = await request(app.getHttpServer())
      .put('/api/v1/admin/settings/dispute-sla')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ moderatorHours: 6, adminHours: 18 })
      .expect(200);
    expect(updated.moderatorHours).toBe(6);
    expect(updated.adminHours).toBe(18);

    // Trả lại mặc định cho các test khác dùng chung DB không bị ảnh hưởng.
    await request(app.getHttpServer())
      .put('/api/v1/admin/settings/dispute-sla')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ moderatorHours: 12, adminHours: 24 })
      .expect(200);
  });
});
