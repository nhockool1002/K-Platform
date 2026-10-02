import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Phase 2 — Ví KPoint & SePay. Test case bắt buộc theo TASK.md DoD:
//  - P2-10: 50 request cộng ví đồng thời không sai lệch số dư (concurrency).
//  - P2-11: webhook retry/duplicate (cùng txnId) không cộng tiền 2 lần.
// Yêu cầu env khi chạy: SEPAY_WEBHOOK_API_KEY=test-sepay-key (khớp hằng số
// SEPAY_TEST_KEY bên dưới) + SEPAY_BANK_ID/SEPAY_BANK_ACCOUNT_NUMBER/
// SEPAY_BANK_ACCOUNT_NAME (giá trị bất kỳ, chỉ cần tồn tại).
const SEPAY_TEST_KEY = 'test-sepay-key';

describe('Payments & Wallet (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const publisherEmail = `e2e-wallet-pub-${suffix}@kplatform.dev`;
  const password = randomBytes(12).toString('hex');

  let publisherId: string;
  let topupCode: string;
  let webhookEventId = 900_000_000;

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
    const publisher = await prisma.user.create({
      data: { email: publisherEmail, passwordHash, activeMode: 'B', role: 'USER' },
    });
    publisherId = publisher.id;
    await prisma.wallet.create({
      data: { userId: publisherId, balanceKpoint: 0n, reservedKpoint: 0n },
    });
  });

  afterAll(async () => {
    await prisma.walletTransaction.deleteMany({ where: { userId: publisherId } });
    await prisma.withdrawal.deleteMany({ where: { userId: publisherId } });
    await prisma.user.deleteMany({ where: { email: publisherEmail } });
    await app.close();
  });

  async function loginAs(email: string): Promise<string> {
    const { body } = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return body.accessToken as string;
  }

  function nextWebhookPayload(amount: number) {
    webhookEventId += 1;
    return {
      id: webhookEventId,
      gateway: 'TestBank',
      transferType: 'in' as const,
      transferAmount: amount,
      content: `NGUYEN VAN A CHUYEN KHOAN KLP_${topupCode} PHI GD`,
      referenceCode: `TEST${webhookEventId}`,
    };
  }

  function sendWebhook(payload: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post('/api/v1/payments/sepay-webhook')
      .set('Authorization', `Apikey ${SEPAY_TEST_KEY}`)
      .send(payload);
  }

  it('P2-04: GET /payments/sepay-qr sinh topupCode duy nhất + QR hợp lệ', async () => {
    const token = await loginAs(publisherEmail);
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/payments/sepay-qr')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(body.content).toMatch(/^KLP_[A-Z0-9]{8}$/);
    expect(body.qrImageUrl).toContain('img.vietqr.io');
    topupCode = body.content.replace('KLP_', '');
  });

  it('Webhook thiếu/sai API Key bị chặn 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payments/sepay-webhook')
      .send(nextWebhookPayload(10_000))
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/payments/sepay-webhook')
      .set('Authorization', 'Apikey wrong-key')
      .send(nextWebhookPayload(10_000))
      .expect(401);
  });

  it('P2-05/P2-06/P2-07: webhook hợp lệ cộng đúng KPoint = transferAmount vào ví', async () => {
    const { body } = await sendWebhook(nextWebhookPayload(100_000)).expect(200);
    expect(body).toEqual({ status: 200, credited: true });

    const token = await loginAs(publisherEmail);
    const wallet = await request(app.getHttpServer())
      .get('/api/v1/payments/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(wallet.body.balanceKpoint).toBe('100000');
  });

  it('P2-06/P2-11: webhook gọi lại với cùng id (txnId) không cộng điểm lần 2', async () => {
    const payload = nextWebhookPayload(50_000);

    const first = await sendWebhook(payload).expect(200);
    expect(first.body.credited).toBe(true);

    const retry = await sendWebhook(payload).expect(200);
    expect(retry.body).toEqual({ status: 200, credited: false, reason: 'duplicate_txn' });

    const token = await loginAs(publisherEmail);
    const wallet = await request(app.getHttpServer())
      .get('/api/v1/payments/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    // 100_000 (test trước) + 50_000 (chỉ 1 lần, không phải 2 lần)
    expect(wallet.body.balanceKpoint).toBe('150000');
  });

  it('P2-10: 50 webhook đồng thời (id khác nhau) cộng ví không sai lệch số dư', async () => {
    const payloads = Array.from({ length: 50 }, () => nextWebhookPayload(1_000));
    const results = await Promise.all(payloads.map((p) => sendWebhook(p)));
    for (const res of results) {
      expect(res.status).toBe(200);
      expect(res.body.credited).toBe(true);
    }

    const token = await loginAs(publisherEmail);
    const wallet = await request(app.getHttpServer())
      .get('/api/v1/payments/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    // 150_000 (2 test trước) + 50 * 1_000
    expect(wallet.body.balanceKpoint).toBe('200000');
  });

  it('P2-08: lập lệnh rút tiền khoá đúng reserved_kpoint, chặn khi vượt số dư khả dụng', async () => {
    const token = await loginAs(publisherEmail);

    await request(app.getHttpServer())
      .post('/api/v1/payments/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amountKpoint: 999_999_999,
        bankId: 'TestBank',
        bankAccountNumber: '0123456789',
        bankAccountName: 'NGUYEN VAN A',
      })
      .expect(400);

    const { body: withdrawal } = await request(app.getHttpServer())
      .post('/api/v1/payments/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amountKpoint: 60_000,
        bankId: 'TestBank',
        bankAccountNumber: '0123456789',
        bankAccountName: 'NGUYEN VAN A',
      })
      .expect(201);
    expect(withdrawal.status).toBe('PENDING');
    expect(withdrawal.amountKpoint).toBe('60000');

    const wallet = await request(app.getHttpServer())
      .get('/api/v1/payments/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(wallet.body.balanceKpoint).toBe('200000');
    expect(wallet.body.reservedKpoint).toBe('60000');
    expect(wallet.body.availableKpoint).toBe('140000');
  });

  it('P2-09: lịch sử giao dịch liệt kê đủ TOPUP_SEPAY + WITHDRAWAL_REQUEST, hiện ở cả side=B', async () => {
    const token = await loginAs(publisherEmail);
    const { body: transactions } = await request(app.getHttpServer())
      .get('/api/v1/payments/transactions?side=B')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const types = transactions.map((t: { type: string }) => t.type);
    expect(types).toContain('TOPUP_SEPAY');
    expect(types).toContain('WITHDRAWAL_REQUEST');
    // SHARED luôn hiện dù filter side=B (nạp/rút không thuộc riêng 1 bên).
    expect(transactions.every((t: { side: string }) => ['B', 'SHARED'].includes(t.side))).toBe(
      true,
    );
  });
});
