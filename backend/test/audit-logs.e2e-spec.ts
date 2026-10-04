import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// P6-08/09/12/13/14/15 — Audit Log: ghi đủ IP/UA/fingerprint, mức CRITICAL đúng,
// không lưu credential, request bị từ chối vẫn được ghi, và API tra cứu chỉ Admin.
const WRONG_PASSWORD = `wrong-${randomBytes(8).toString('hex')}`;
const SEPAY_TEST_KEY = process.env.SEPAY_WEBHOOK_API_KEY ?? '';

describe('Audit Logs (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const adminEmail = `e2e-audit-admin-${suffix}@kplatform.dev`;
  const userEmail = `e2e-audit-user-${suffix}@kplatform.dev`;
  const targetEmail = `e2e-audit-target-${suffix}@kplatform.dev`;
  const password = randomBytes(12).toString('hex');
  const UA = `e2e-audit-agent/${suffix}`;
  const FINGERPRINT = `fp-${suffix}`;
  const startedAt = new Date();

  let adminToken: string;
  let userToken: string;
  let adminId: string;
  let userId: string;
  let targetId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    (app.getHttpAdapter().getInstance() as { set(k: string, v: unknown): void }).set(
      'trust proxy',
      1,
    );
    await app.init();
    prisma = app.get(PrismaService);

    const passwordHash = await bcrypt.hash(password, 10);
    adminId = (
      await prisma.user.create({
        data: { email: adminEmail, passwordHash, activeMode: 'A', role: 'ADMIN' },
      })
    ).id;
    userId = (
      await prisma.user.create({
        data: { email: userEmail, passwordHash, activeMode: 'A', role: 'USER' },
      })
    ).id;
    targetId = (
      await prisma.user.create({
        data: { email: targetEmail, passwordHash, activeMode: 'A', role: 'USER' },
      })
    ).id;
    await prisma.wallet.create({ data: { userId: targetId } });

    adminToken = await loginAs(adminEmail);
    userToken = await loginAs(userEmail);
  });

  afterAll(async () => {
    const emails = [adminEmail, userEmail, targetEmail];
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actor: { email: { in: emails } } }, { createdAt: { gte: startedAt } }] },
    });
    await prisma.trustScoreTransaction.deleteMany({ where: { user: { email: { in: emails } } } });
    await prisma.wallet.deleteMany({ where: { user: { email: { in: emails } } } });
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

  function rowsFor(path: string) {
    return prisma.auditLog.findMany({
      where: { path, createdAt: { gte: startedAt } },
      orderBy: { createdAt: 'desc' },
    });
  }

  it('P6-09/P6-14: thao tác CRITICAL (+/- Trust Score) ghi đủ IP, UA, fingerprint đã hash', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/admin/trust-score/${targetId}/adjust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('User-Agent', UA)
      .set('X-Device-Fingerprint', FINGERPRINT)
      .send({ delta: 5, note: 'audit e2e' })
      .expect(201);

    const [row] = await rowsFor(`/api/v1/admin/trust-score/${targetId}/adjust`);
    expect(row).toBeDefined();
    expect(row!.actorId).toBe(adminId);
    expect(row!.actorRole).toBe('ADMIN');
    expect(row!.level).toBe('CRITICAL');
    expect(row!.actionType).toBe('MANUAL_TOPUP');
    expect(row!.statusCode).toBe(201);
    expect(row!.userAgent).toBe(UA);
    expect(row!.ip).toEqual(expect.any(String));
    expect(row!.deviceFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(row!.requestPayload).toEqual({ delta: 5, note: 'audit e2e' });
  });

  it('P6-08: thao tác ghi thủ công trong service (khoá tài khoản) ghi 1 bản, đủ context', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${targetId}/active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('User-Agent', UA)
      .send({ active: false })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${targetId}/active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: true })
      .expect(200);

    const rows = await prisma.auditLog.findMany({
      where: {
        targetResource: `user:${targetId}`,
        actionType: 'UPDATE',
        createdAt: { gte: startedAt },
      },
      orderBy: { createdAt: 'asc' },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]!.userAgent).toBe(UA);
    expect(rows[0]!.payloadBefore).toEqual({ disabledAt: null });
    expect(rows[0]!.payloadAfter).toEqual({ disabledAt: expect.any(String) });
  });

  it('P6-12: đăng nhập IP lạ (sau khi đã có lịch sử đăng nhập) được đánh dấu CRITICAL', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '198.51.100.7')
      .send({ email: userEmail, password })
      .expect(200);

    const logins = await prisma.auditLog.findMany({
      where: { actorId: userId, actionType: 'LOGIN', createdAt: { gte: startedAt } },
      orderBy: { createdAt: 'asc' },
    });
    const last = logins[logins.length - 1]!;
    expect(last.ip).toBe('198.51.100.7');
    expect(last.level).toBe('CRITICAL');
    expect(logins.slice(0, -1).every((r) => r.level === 'INFO')).toBe(true);
  });

  it('P6-15: đăng nhập sai ghi WARNING, không lưu mật khẩu', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password: WRONG_PASSWORD })
      .expect(401);

    const [row] = await rowsFor('/api/v1/auth/login').then((rs) =>
      rs.filter((r) => r.statusCode === 401),
    );
    expect(row).toBeDefined();
    expect(row!.level).toBe('WARNING');
    expect(row!.actorId).toBeNull();
    expect(JSON.stringify(row!.requestPayload)).not.toContain('sai-mat-khau-e2e');
    expect((row!.requestPayload as { password?: string }).password).toBe('[redacted]');
  });

  it('P6-15: request bị từ chối quyền (USER gọi route Admin) vẫn được ghi với statusCode 403', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/admin/trust-score/${targetId}/adjust`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ delta: 99, note: 'hack' })
      .expect(403);

    const [row] = await rowsFor(`/api/v1/admin/trust-score/${targetId}/adjust`).then((rs) =>
      rs.filter((r) => r.statusCode === 403),
    );
    expect(row).toBeDefined();
    expect(row!.actorId).toBe(userId);
    expect(row!.level).toBe('WARNING');
  });

  it('P6-15: webhook SePay (không có người thao tác) ghi WEBHOOK với actor null', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payments/sepay-webhook')
      .set('Authorization', `Apikey ${SEPAY_TEST_KEY}`)
      .send({ id: 1, content: 'khong co ma', transferAmount: 1000, transferType: 'in' })
      .expect(200);

    const [row] = await rowsFor('/api/v1/payments/sepay-webhook');
    expect(row).toBeDefined();
    expect(row!.actionType).toBe('WEBHOOK');
    expect(row!.actorId).toBeNull();
  });

  it('P6-13: API tra cứu chỉ Admin; lọc theo level CRITICAL và xem chi tiết', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    const { body } = await request(app.getHttpServer())
      .get('/api/v1/admin/audit-logs?level=CRITICAL&pageSize=50')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.every((r: { level: string }) => r.level === 'CRITICAL')).toBe(true);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/admin/audit-logs/${body.items[0].id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(detail.body).toHaveProperty('requestPayload');
    expect(detail.body).toHaveProperty('payloadAfter');
  });

  it('P6-13: lọc theo actor email và phân trang', async () => {
    const { body } = await request(app.getHttpServer())
      .get(`/api/v1/admin/audit-logs?actor=${encodeURIComponent(adminEmail)}&pageSize=2&page=1`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(body.pageSize).toBe(2);
    expect(body.items.length).toBeLessThanOrEqual(2);
    expect(
      body.items.every((r: { actor: { email: string } | null }) => r.actor?.email === adminEmail),
    ).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(body.items.length);
  });
});
