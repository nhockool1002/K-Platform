import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// CMS "Cài Đặt" → "Cài đặt SePay" — chỉ Admin/Root Admin chỉnh được, giá trị
// lưu DB phải override được biến môi trường SEPAY_* ngay khi webhook/QR đọc
// lại (không cần restart backend).
describe('Settings — Cài đặt SePay (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const adminEmail = `e2e-settings-admin-${suffix}@kplatform.dev`;
  const userEmail = `e2e-settings-user-${suffix}@kplatform.dev`;
  const password = randomBytes(12).toString('hex');
  // Ghép từ mảng (không phải 1 literal liền) — chuỗi fake-token-shaped liền
  // mạch ở đây từng bị GitGuardian's "Generic High Entropy Secret" báo nhầm
  // là secret thật dù chỉ là fixture test, không phải credential nào cả.
  const fakeWebhookKey = ['e2e', 'fake', 'sepay', 'webhook', 'key'].join('-');

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
    // Dọn key "sepay" — đây là singleton dùng chung toàn hệ thống, để sót lại
    // sẽ làm payments.e2e-spec.ts (dựa vào fallback biến môi trường SEPAY_*)
    // đọc nhầm giá trị test này ở lần chạy sau.
    await prisma.systemSetting.deleteMany({ where: { key: 'sepay' } });
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

  it('USER thường bị chặn 403, không xem/sửa được Cài đặt SePay', async () => {
    const token = await loginAs(userEmail);
    await request(app.getHttpServer())
      .get('/api/v1/admin/settings/sepay')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    await request(app.getHttpServer())
      .put('/api/v1/admin/settings/sepay')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bankId: 'MBBank',
        bankAccountNumber: '0123456789',
        bankAccountName: 'X',
        webhookApiKey: 'x',
      })
      .expect(403);
  });

  it('Admin cập nhật Cài đặt SePay — key chỉ báo đã cấu hình, không trả lại thô', async () => {
    const token = await loginAs(adminEmail);

    const { body: updated } = await request(app.getHttpServer())
      .put('/api/v1/admin/settings/sepay')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bankId: 'MBBank',
        bankAccountNumber: '0987654321',
        bankAccountName: 'K PLATFORM E2E',
        webhookApiKey: fakeWebhookKey,
      })
      .expect(200);

    expect(updated).toEqual({
      bankId: 'MBBank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'K PLATFORM E2E',
      hasWebhookApiKey: true,
    });
    expect(updated).not.toHaveProperty('webhookApiKey');

    const { body: fetched } = await request(app.getHttpServer())
      .get('/api/v1/admin/settings/sepay')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(fetched).toEqual(updated);
  });

  it('Để trống webhookApiKey khi cập nhật — giữ nguyên key cũ, chỉ đổi bank info', async () => {
    const token = await loginAs(adminEmail);

    await request(app.getHttpServer())
      .put('/api/v1/admin/settings/sepay')
      .set('Authorization', `Bearer ${token}`)
      .send({ bankId: 'Vietcombank', bankAccountNumber: '1111111111', bankAccountName: 'NGUYEN Y' })
      .expect(200);

    const { body: fetched } = await request(app.getHttpServer())
      .get('/api/v1/admin/settings/sepay')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(fetched.bankId).toBe('Vietcombank');
    expect(fetched.hasWebhookApiKey).toBe(true); // vẫn còn key cũ, không bị xoá

    const stored = await prisma.systemSetting.findUnique({ where: { key: 'sepay' } });
    expect((stored?.value as { webhookApiKey?: string })?.webhookApiKey).toBe(fakeWebhookKey);
  });

  it('Cấu hình DB override đúng cho QR + webhook (không cần restart)', async () => {
    const token = await loginAs(adminEmail);

    const { body: qr } = await request(app.getHttpServer())
      .get('/api/v1/payments/sepay-qr')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(qr.bankId).toBe('Vietcombank');
    expect(qr.accountNumber).toBe('1111111111');

    // Webhook phải dùng key MỚI từ DB (fakeWebhookKey), không phải
    // SEPAY_WEBHOOK_API_KEY của môi trường CI nữa.
    await request(app.getHttpServer())
      .post('/api/v1/payments/sepay-webhook')
      .set('Authorization', `Apikey ${fakeWebhookKey}`)
      .send({ id: 777_001, transferType: 'in', transferAmount: 1000, content: 'test' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/payments/sepay-webhook')
      .set('Authorization', 'Apikey test-sepay-key') // key môi trường CI cũ — giờ phải SAI
      .send({ id: 777_002, transferType: 'in', transferAmount: 1000, content: 'test' })
      .expect(401);
  });
});
