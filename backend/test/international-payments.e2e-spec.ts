import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Thanh toán quốc tế (BMC) — luồng tạo mã KPL-, upload biên lai, Admin đối soát
// duyệt/từ chối, quản lý gói nạp (CRUD) và phân quyền.
describe('International Payments — Buy Me a Coffee (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const adminEmail = `e2e-bmc-admin-${suffix}@kplatform.dev`;
  const userEmail = `e2e-bmc-user-${suffix}@kplatform.dev`;
  const otherUserEmail = `e2e-bmc-other-${suffix}@kplatform.dev`;
  const password = randomBytes(12).toString('hex');
  const packageName = `e2e-bmc-pkg-${suffix}`;
  const PNG_1PX = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  );

  let adminToken: string;
  let userToken: string;
  let otherToken: string;
  let userId: string;
  let packageId: string;

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
      data: { email: userEmail, passwordHash, activeMode: 'A', role: 'USER' },
    });
    userId = user.id;
    await prisma.wallet.create({ data: { userId } });
    await prisma.user.create({
      data: { email: otherUserEmail, passwordHash, activeMode: 'A', role: 'USER' },
    });

    adminToken = await loginAs(adminEmail);
    userToken = await loginAs(userEmail);
    otherToken = await loginAs(otherUserEmail);
  });

  afterAll(async () => {
    const emails = [adminEmail, userEmail, otherUserEmail];
    await prisma.bmcTopup.deleteMany({ where: { user: { email: { in: emails } } } });
    await prisma.walletTransaction.deleteMany({ where: { user: { email: { in: emails } } } });
    await prisma.auditLog.deleteMany({ where: { actor: { email: adminEmail } } });
    await prisma.internationalPackage.deleteMany({ where: { name: packageName } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  async function loginAs(email: string): Promise<string> {
    const { body } = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return body.accessToken as string;
  }

  it('gói nạp mặc định có sẵn cho user (chỉ gói active)', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/payments/bmc/packages')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(body.usdToVnd).toEqual(expect.any(Number));
    expect(body.packages.length).toBeGreaterThan(0);
    for (const p of body.packages) {
      expect(p.bmcUrl).toMatch(/^https:\/\//);
      expect(p.estimatedKpoint).toBe(String(Math.round(Number(p.amountUsd) * body.usdToVnd)));
    }
  });

  it('Admin tạo gói nạp mới, USER không tạo được (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/bmc/packages')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: packageName, amountUsd: 15, bmcUrl: 'https://buymeacoffee.com/x/e/1' })
      .expect(403);

    const { body } = await request(app.getHttpServer())
      .post('/api/v1/admin/bmc/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: packageName, amountUsd: 15, bmcUrl: 'https://buymeacoffee.com/x/e/1' })
      .expect(201);
    packageId = body.id;
  });

  it('USER bắt đầu nạp → nhận mã KPL- và tỷ giá snapshot, KPoint = USD × tỷ giá', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/v1/payments/bmc/topups')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ packageId })
      .expect(201);

    expect(body.reference).toMatch(/^KPL-[A-Z2-9]{8}$/);
    expect(body.status).toBe('AWAITING_PAYMENT');
    expect(body.kpointAmount).toBe(String(Math.round(15 * body.usdToVnd)));
    expect(body.hasReceipt).toBe(false);
    expect(body.bmcUrl).toBe('https://buymeacoffee.com/x/e/1');
    expect(body.packageName).toBe(packageName);
  });

  it('USER upload biên lai → chuyển sang PENDING_MANUAL_VERIFICATION, không upload lại được', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/payments/bmc/topups')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ packageId })
      .expect(201);
    const topupId = created.body.id as string;

    const uploaded = await request(app.getHttpServer())
      .post(`/api/v1/payments/bmc/topups/${topupId}/receipt`)
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', PNG_1PX, { filename: 'receipt.png', contentType: 'image/png' })
      .expect(201);
    expect(uploaded.body.status).toBe('PENDING_MANUAL_VERIFICATION');
    expect(uploaded.body.hasReceipt).toBe(true);

    await request(app.getHttpServer())
      .post(`/api/v1/payments/bmc/topups/${topupId}/receipt`)
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', PNG_1PX, { filename: 'again.png', contentType: 'image/png' })
      .expect(400);
  });

  it('USER khác không upload được biên lai của người khác (404)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/payments/bmc/topups')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ packageId })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/payments/bmc/topups/${created.body.id}/receipt`)
      .set('Authorization', `Bearer ${otherToken}`)
      .attach('file', PNG_1PX, { filename: 'receipt.png', contentType: 'image/png' })
      .expect(404);
  });

  it('Đối soát: Admin thấy giao dịch BMC kèm hạn đối soát, USER không truy cập được (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/topups')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    const { body } = await request(app.getHttpServer())
      .get('/api/v1/admin/topups?source=BMC&status=PENDING_MANUAL_VERIFICATION')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(body.length).toBeGreaterThan(0);
    for (const row of body) {
      expect(row.source).toBe('BMC');
      expect(row.status).toBe('PENDING_MANUAL_VERIFICATION');
      expect(row.reviewDeadline).toEqual(expect.any(String));
    }
  });

  it('Từ chối bắt buộc có lý do; từ chối xong không cộng ví', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/payments/bmc/topups')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ packageId })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/payments/bmc/topups/${created.body.id}/receipt`)
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', PNG_1PX, { filename: 'receipt.png', contentType: 'image/png' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/bmc/topups/${created.body.id}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'REJECT' })
      .expect(400);

    const rejected = await request(app.getHttpServer())
      .patch(`/api/v1/admin/bmc/topups/${created.body.id}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'REJECT', reason: 'Không khớp mã KPL- trong lời nhắn BMC' })
      .expect(200);
    expect(rejected.body.status).toBe('REJECTED');
    expect(rejected.body.rejectReason).toBe('Không khớp mã KPL- trong lời nhắn BMC');

    const refundRows = await prisma.walletTransaction.count({
      where: { userId, note: { contains: created.body.reference } },
    });
    expect(refundRows).toBe(0);
  });

  it('Duyệt: cộng đúng KPoint vào ví, ghi ledger TOPUP_BMC + audit log, không duyệt lại được', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/payments/bmc/topups')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ packageId })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/payments/bmc/topups/${created.body.id}/receipt`)
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', PNG_1PX, { filename: 'receipt.png', contentType: 'image/png' })
      .expect(201);

    const before = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    const approved = await request(app.getHttpServer())
      .patch(`/api/v1/admin/bmc/topups/${created.body.id}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVE' })
      .expect(200);
    expect(approved.body.status).toBe('APPROVED');

    const after = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    expect(after.balanceKpoint - before.balanceKpoint).toBe(BigInt(created.body.kpointAmount));

    const ledger = await prisma.walletTransaction.findFirst({
      where: { userId, type: 'TOPUP_BMC', note: { contains: created.body.reference } },
    });
    expect(ledger).not.toBeNull();
    expect(ledger!.balanceDeltaKpoint).toBe(BigInt(created.body.kpointAmount));

    const audit = await prisma.auditLog.findFirst({
      where: { targetResource: `bmc_topup:${created.body.id}` },
    });
    expect(audit?.actionType).toBe('MANUAL_TOPUP');

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/bmc/topups/${created.body.id}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVE' })
      .expect(400);
  });

  it('Admin xem được biên lai đã upload', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/payments/bmc/topups')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ packageId })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/payments/bmc/topups/${created.body.id}/receipt`)
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', PNG_1PX, { filename: 'receipt.png', contentType: 'image/png' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/admin/bmc/topups/${created.body.id}/receipt`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/admin/bmc/topups/${created.body.id}/receipt`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('Admin sửa/tắt gói → USER không còn thấy gói đó; xoá gói được', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/bmc/packages/${packageId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false })
      .expect(200);

    const { body } = await request(app.getHttpServer())
      .get('/api/v1/payments/bmc/packages')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(body.packages.map((p: { id: string }) => p.id)).not.toContain(packageId);

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/bmc/packages/${packageId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/payments/bmc/topups')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ packageId })
      .expect(400);
  });
});
