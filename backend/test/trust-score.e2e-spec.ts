import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ROOT_ADMIN_ID } from '../src/common/constants.js';

// B-05 — Trust Score. Test case:
//  - 5 rule hệ thống mặc định tồn tại sẵn (seed lúc app khởi động).
//  - CRUD rule tự tạo (Admin), không xoá được rule hệ thống.
//  - Admin +/- điểm trực tiếp cho 1 tài khoản, ghi đúng lịch sử.
//  - Không ai (kể cả chính nó qua API) chỉnh được Trust Score của Root Admin.
//  - Leaderboard chỉ xếp hạng role USER, sắp giảm dần, không giới hạn trần 100.
describe('Trust Score (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const adminEmail = `e2e-trust-admin-${suffix}@kplatform.dev`;
  const userEmail = `e2e-trust-user-${suffix}@kplatform.dev`;
  const rootEmail = `e2e-trust-root-${suffix}@kplatform.dev`;
  const password = randomBytes(12).toString('hex');
  const seededEmails = [adminEmail, userEmail];

  let userId: string;
  let rootExisted = false;

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
      data: { email: userEmail, passwordHash, activeMode: 'B', role: 'USER', trustScore: 100 },
    });
    userId = user.id;

    // Root Admin có thể đã tồn tại từ file e2e khác chạy trước (ID hard-code
    // dùng chung) — chỉ tạo mới nếu chưa có, và chỉ xoá nếu chính file này tạo.
    const existingRoot = await prisma.user.findUnique({ where: { id: ROOT_ADMIN_ID } });
    if (existingRoot) {
      rootExisted = true;
    } else {
      await prisma.user.create({
        data: { id: ROOT_ADMIN_ID, email: rootEmail, passwordHash, role: 'ROOT_ADMIN' },
      });
    }
  });

  afterAll(async () => {
    await prisma.trustScoreTransaction.deleteMany({
      where: { OR: [{ user: { email: { in: seededEmails } } }, { userId: ROOT_ADMIN_ID }] },
    });
    await prisma.trustScoreRule.deleteMany({
      where: { code: { startsWith: `E2E_TRUST_${suffix}` } },
    });
    await prisma.user.deleteMany({ where: { email: { in: seededEmails } } });
    if (!rootExisted) {
      await prisma.user.deleteMany({ where: { id: ROOT_ADMIN_ID } });
    }
    await app.close();
  });

  async function loginAs(email: string): Promise<string> {
    const { body } = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return body.accessToken as string;
  }

  it('5 rule hệ thống mặc định tồn tại sẵn, USER thường bị chặn 403', async () => {
    const userToken = await loginAs(userEmail);
    await request(app.getHttpServer())
      .get('/api/v1/admin/trust-score/rules')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    const adminToken = await loginAs(adminEmail);
    const { body: rules } = await request(app.getHttpServer())
      .get('/api/v1/admin/trust-score/rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const codes = rules.map((r: { code: string }) => r.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'DISPUTE_LOST',
        'PROOF_REJECTED',
        'WEEKLY_3_PROOFS',
        'WEEKLY_5_PROOFS',
        'ONLINE_STREAK_7D',
      ]),
    );
    const disputeLost = rules.find((r: { code: string }) => r.code === 'DISPUTE_LOST');
    expect(disputeLost.isSystem).toBe(true);
    expect(disputeLost.points).toBe(-10);
  });

  it('Admin tạo rule tự định nghĩa, không xoá được rule hệ thống', async () => {
    const adminToken = await loginAs(adminEmail);
    const code = `E2E_TRUST_${suffix}_BONUS`;

    const { body: created } = await request(app.getHttpServer())
      .post('/api/v1/admin/trust-score/rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code, label: 'Hỗ trợ cộng đồng xuất sắc', points: 15 })
      .expect(201);
    expect(created.isSystem).toBe(false);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/trust-score/rules/${created.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ points: 20 })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/trust-score/rules/${created.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const { body: rules } = await request(app.getHttpServer())
      .get('/api/v1/admin/trust-score/rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const disputeLost = rules.find((r: { code: string }) => r.code === 'DISPUTE_LOST');

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/trust-score/rules/${disputeLost.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('Admin +/- điểm trực tiếp cho 1 tài khoản, ghi đúng lịch sử', async () => {
    const adminToken = await loginAs(adminEmail);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/trust-score/${userId}/adjust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ delta: 25, note: 'Thưởng đóng góp cộng đồng' })
      .expect(201);

    const { body: user } = await request(app.getHttpServer())
      .get(`/api/v1/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(user.trustScore).toBe(125);

    const { body: history } = await request(app.getHttpServer())
      .get(`/api/v1/admin/trust-score/${userId}/history`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(history[0].delta).toBe(25);
    expect(history[0].note).toBe('Thưởng đóng góp cộng đồng');

    await request(app.getHttpServer())
      .post(`/api/v1/admin/trust-score/${userId}/adjust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ delta: -200, note: 'Phạt gian lận nghiêm trọng' })
      .expect(201);

    const { body: afterPenalty } = await request(app.getHttpServer())
      .get(`/api/v1/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    // Không giới hạn sàn — cho phép âm (yêu cầu B-05: không giới hạn trần
    // 100, và code không áp đặt sàn nào).
    expect(afterPenalty.trustScore).toBe(-75);

    // delta = 0 bị từ chối.
    await request(app.getHttpServer())
      .post(`/api/v1/admin/trust-score/${userId}/adjust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ delta: 0 })
      .expect(400);
  });

  it('Không ai chỉnh được Trust Score của Root Admin qua API', async () => {
    const adminToken = await loginAs(adminEmail);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/trust-score/${ROOT_ADMIN_ID}/adjust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ delta: 50 })
      .expect(403);
  });

  it('Leaderboard chỉ xếp USER thường, sắp giảm dần theo điểm', async () => {
    const adminToken = await loginAs(adminEmail);
    const { body: leaderboard } = await request(app.getHttpServer())
      .get('/api/v1/admin/trust-score/leaderboard?limit=20')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(leaderboard.every((u: { email: string }) => u.email !== adminEmail)).toBe(true);
    for (let i = 1; i < leaderboard.length; i++) {
      expect(leaderboard[i - 1].trustScore).toBeGreaterThanOrEqual(leaderboard[i].trustScore);
    }
  });
});
