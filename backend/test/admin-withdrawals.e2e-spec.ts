import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// CMS "Yêu Cầu Rút Tiền" — Admin duyệt/từ chối lệnh rút của Tài khoản người
// dùng. Test case:
//  - USER thường bị chặn 403.
//  - APPROVE: trừ thật balance_kpoint + reserved_kpoint, ghi WITHDRAWAL_COMPLETED.
//  - REJECT: chỉ giải phóng reserved_kpoint (hoàn lại khả dụng), ghi WITHDRAWAL_REJECTED.
//  - Duyệt/từ chối 1 lệnh đã xử lý bị chặn 400 (chặn duyệt trùng).
describe('Admin Withdrawals (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const adminEmail = `e2e-wd-admin-${suffix}@kplatform.dev`;
  const userEmail = `e2e-wd-user-${suffix}@kplatform.dev`;
  const password = randomBytes(12).toString('hex');

  const seededEmails = [adminEmail, userEmail];

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
    const user = await prisma.user.create({
      data: { email: userEmail, passwordHash, activeMode: 'B', role: 'USER' },
    });
    await prisma.wallet.create({
      data: { userId: user.id, balanceKpoint: 200_000n, reservedKpoint: 0n },
    });
  });

  afterAll(async () => {
    await prisma.withdrawal.deleteMany({ where: { user: { email: { in: seededEmails } } } });
    await prisma.walletTransaction.deleteMany({
      where: { user: { email: { in: seededEmails } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: seededEmails } } });
    await app.close();
  });

  async function loginAs(email: string): Promise<string> {
    const { body } = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return body.accessToken as string;
  }

  async function createWithdrawal(token: string, amountKpoint: number) {
    const { body } = await request(app.getHttpServer())
      .post('/api/v1/payments/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amountKpoint,
        bankId: 'TestBank',
        bankAccountNumber: '0123456789',
        bankAccountName: 'NGUYEN VAN A',
      })
      .expect(201);
    return body;
  }

  it('USER thường bị chặn 403, không xem/duyệt được danh sách rút tiền', async () => {
    const userToken = await loginAs(userEmail);
    await request(app.getHttpServer())
      .get('/api/v1/admin/withdrawals')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('APPROVE — trừ thật balance + reserved, ghi WITHDRAWAL_COMPLETED', async () => {
    const userToken = await loginAs(userEmail);
    const adminToken = await loginAs(adminEmail);
    const withdrawal = await createWithdrawal(userToken, 50_000);

    const { body: decided } = await request(app.getHttpServer())
      .patch(`/api/v1/admin/withdrawals/${withdrawal.id}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVE' })
      .expect(200);
    expect(decided.status).toBe('APPROVED');

    const { body: wallet } = await request(app.getHttpServer())
      .get('/api/v1/payments/wallet')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(wallet.balanceKpoint).toBe('150000');
    expect(wallet.reservedKpoint).toBe('0');

    const { body: txs } = await request(app.getHttpServer())
      .get('/api/v1/payments/transactions')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    const tx = txs.find((t: { type: string }) => t.type === 'WITHDRAWAL_COMPLETED');
    expect(tx).toBeDefined();
    expect(tx.balanceDeltaKpoint).toBe('-50000');
    expect(tx.reservedDeltaKpoint).toBe('-50000');

    // Duyệt lại lệnh đã xử lý phải bị chặn.
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/withdrawals/${withdrawal.id}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVE' })
      .expect(400);
  });

  it('REJECT — chỉ giải phóng reserved_kpoint, balance không đổi, ghi WITHDRAWAL_REJECTED', async () => {
    const userToken = await loginAs(userEmail);
    const adminToken = await loginAs(adminEmail);
    const withdrawal = await createWithdrawal(userToken, 50_000);

    const { body: beforeWallet } = await request(app.getHttpServer())
      .get('/api/v1/payments/wallet')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(beforeWallet.reservedKpoint).toBe('50000');

    const { body: decided } = await request(app.getHttpServer())
      .patch(`/api/v1/admin/withdrawals/${withdrawal.id}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'REJECT', note: 'Sai thông tin ngân hàng' })
      .expect(200);
    expect(decided.status).toBe('REJECTED');

    const { body: afterWallet } = await request(app.getHttpServer())
      .get('/api/v1/payments/wallet')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(afterWallet.balanceKpoint).toBe(beforeWallet.balanceKpoint);
    expect(afterWallet.reservedKpoint).toBe('0');

    const { body: txs } = await request(app.getHttpServer())
      .get('/api/v1/payments/transactions')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    const tx = txs.find((t: { type: string }) => t.type === 'WITHDRAWAL_REJECTED');
    expect(tx).toBeDefined();
    expect(tx.reservedDeltaKpoint).toBe('-50000');
    expect(tx.balanceDeltaKpoint).toBe('0');
  });

  it('GET /admin/withdrawals lọc theo status', async () => {
    const adminToken = await loginAs(adminEmail);
    const { body: approvedList } = await request(app.getHttpServer())
      .get('/api/v1/admin/withdrawals?status=APPROVED')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(approvedList.every((w: { status: string }) => w.status === 'APPROVED')).toBe(true);
    expect(approvedList.some((w: { user: { email: string } }) => w.user.email === userEmail)).toBe(
      true,
    );
  });
});
