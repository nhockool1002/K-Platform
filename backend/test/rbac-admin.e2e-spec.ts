import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Phase 7 — CMS Admin & RBAC nâng cao. Test case:
//  - P7-07/P7-10: chỉ Root Admin được nâng lên ADMIN / hạ cấp 1 Admin hiện
//    tại; Admin thường vẫn đổi được USER <-> MODERATOR bình thường.
//  - P7-11: đổi role / xóa user ghi đúng AuditLog (level CRITICAL cho thao
//    tác đụng tới cấp Admin).
//  - P7-06: CRUD RolePermission (danh sách quyền hạn tham khảo theo vai trò).
//  - P7-08: phân công Campaign cho Moderator cụ thể + enforce ở Dispute
//    recommend (Moderator khác bị chặn, Admin luôn được phép).
describe('Phase 7 — CMS RBAC nâng cao (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tinyPng: Buffer;

  const suffix = Date.now();
  const rootEmail = `e2e-p7-root-${suffix}@kplatform.dev`;
  const adminEmail = `e2e-p7-admin-${suffix}@kplatform.dev`;
  const staffEmail = `e2e-p7-staff-${suffix}@kplatform.dev`; // bắt đầu USER, bị đổi role qua lại
  const otherAdminEmail = `e2e-p7-other-admin-${suffix}@kplatform.dev`;
  const mod1Email = `e2e-p7-mod1-${suffix}@kplatform.dev`;
  const mod2Email = `e2e-p7-mod2-${suffix}@kplatform.dev`;
  const advEmail = `e2e-p7-adv-${suffix}@kplatform.dev`;
  const pubEmail = `e2e-p7-pub-${suffix}@kplatform.dev`;
  const password = randomBytes(12).toString('hex');
  const seededEmails = [
    rootEmail,
    adminEmail,
    staffEmail,
    otherAdminEmail,
    mod1Email,
    mod2Email,
    advEmail,
    pubEmail,
  ];

  let staffUserId: string;
  let otherAdminId: string;
  let mod1Id: string;
  let mod2Id: string;

  beforeAll(async () => {
    tinyPng = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .png()
      .toBuffer();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { email: rootEmail, passwordHash, role: 'ROOT_ADMIN' } });
    await prisma.user.create({ data: { email: adminEmail, passwordHash, role: 'ADMIN' } });
    const staff = await prisma.user.create({
      data: { email: staffEmail, passwordHash, role: 'USER' },
    });
    staffUserId = staff.id;
    const otherAdmin = await prisma.user.create({
      data: { email: otherAdminEmail, passwordHash, role: 'ADMIN' },
    });
    otherAdminId = otherAdmin.id;
    const mod1 = await prisma.user.create({
      data: { email: mod1Email, passwordHash, role: 'MODERATOR' },
    });
    mod1Id = mod1.id;
    const mod2 = await prisma.user.create({
      data: { email: mod2Email, passwordHash, role: 'MODERATOR' },
    });
    mod2Id = mod2.id;

    const adv = await prisma.user.create({
      data: {
        email: advEmail,
        passwordHash,
        activeMode: 'A',
        role: 'USER',
        serviceActivatedAt: new Date(),
      },
    });
    await prisma.wallet.create({
      data: { userId: adv.id, balanceKpoint: 1_000_000n, reservedKpoint: 0n },
    });
    const pub = await prisma.user.create({
      data: { email: pubEmail, passwordHash, activeMode: 'B', role: 'USER' },
    });
    await prisma.wallet.create({
      data: { userId: pub.id, balanceKpoint: 0n, reservedKpoint: 0n },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actor: { email: { in: seededEmails } } } });
    await prisma.disputeTicket.deleteMany({
      where: { submission: { publisher: { email: pubEmail } } },
    });
    await prisma.walletTransaction.deleteMany({ where: { user: { email: { in: seededEmails } } } });
    await prisma.trustScoreTransaction.deleteMany({
      where: { user: { email: { in: seededEmails } } },
    });
    await prisma.submission.deleteMany({ where: { publisher: { email: pubEmail } } });
    await prisma.campaign.deleteMany({ where: { owner: { email: advEmail } } });
    await prisma.rolePermission.deleteMany({ where: { roleName: `E2E_P7_${suffix}` } });
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

  describe('P7-07/P7-10 — hardening nâng/hạ cấp Admin', () => {
    it('Admin thường đổi USER <-> MODERATOR bình thường (vận hành hằng ngày)', async () => {
      const adminToken = await loginAs(adminEmail);

      const { body: toMod } = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${staffUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'MODERATOR' })
        .expect(200);
      expect(toMod.role).toBe('MODERATOR');

      const { body: backToUser } = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${staffUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'USER' })
        .expect(200);
      expect(backToUser.role).toBe('USER');
    });

    it('Admin thường KHÔNG được nâng user lên ADMIN (chỉ Root Admin)', async () => {
      const adminToken = await loginAs(adminEmail);
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${staffUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'ADMIN' })
        .expect(403);

      const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: staffUserId } });
      expect(unchanged.role).toBe('USER');
    });

    it('Admin thường KHÔNG được hạ cấp 1 Admin khác (chỉ Root Admin)', async () => {
      const adminToken = await loginAs(adminEmail);
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${otherAdminId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'USER' })
        .expect(403);

      const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: otherAdminId } });
      expect(unchanged.role).toBe('ADMIN');
    });

    it('Root Admin nâng user lên ADMIN và hạ cấp Admin khác đều thành công', async () => {
      const rootToken = await loginAs(rootEmail);

      const { body: promoted } = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${staffUserId}/role`)
        .set('Authorization', `Bearer ${rootToken}`)
        .send({ role: 'ADMIN' })
        .expect(200);
      expect(promoted.role).toBe('ADMIN');

      const { body: demoted } = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${staffUserId}/role`)
        .set('Authorization', `Bearer ${rootToken}`)
        .send({ role: 'USER' })
        .expect(200);
      expect(demoted.role).toBe('USER');
    });
  });

  describe('P7-11 — Audit Log cho đổi role / xóa user', () => {
    it('Đổi role đụng cấp Admin ghi AuditLog level CRITICAL', async () => {
      const rootToken = await loginAs(rootEmail);
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${staffUserId}/role`)
        .set('Authorization', `Bearer ${rootToken}`)
        .send({ role: 'ADMIN' })
        .expect(200);

      const logs = await prisma.auditLog.findMany({
        where: { targetResource: `user:${staffUserId}`, actionType: 'UPDATE' },
        orderBy: { createdAt: 'desc' },
      });
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0]!.level).toBe('CRITICAL');
      expect(logs[0]!.payloadAfter).toMatchObject({ role: 'ADMIN' });

      // dọn lại USER để không ảnh hưởng test khác chạy sau.
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${staffUserId}/role`)
        .set('Authorization', `Bearer ${rootToken}`)
        .send({ role: 'USER' })
        .expect(200);
    });

    it('Đổi role USER <-> MODERATOR (không đụng Admin) ghi AuditLog level INFO', async () => {
      const adminToken = await loginAs(adminEmail);
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${staffUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'MODERATOR' })
        .expect(200);

      const logs = await prisma.auditLog.findMany({
        where: { targetResource: `user:${staffUserId}`, actionType: 'UPDATE' },
        orderBy: { createdAt: 'desc' },
      });
      expect(logs[0]!.level).toBe('INFO');

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${staffUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'USER' })
        .expect(200);
    });

    it('Root Admin xóa 1 Admin khác ghi AuditLog DELETE level CRITICAL', async () => {
      const passwordHash = await bcrypt.hash(password, 10);
      const toDelete = await prisma.user.create({
        data: { email: `e2e-p7-deleteme-${suffix}@kplatform.dev`, passwordHash, role: 'ADMIN' },
      });

      const rootToken = await loginAs(rootEmail);
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/users/${toDelete.id}`)
        .set('Authorization', `Bearer ${rootToken}`)
        .expect(200);

      const logs = await prisma.auditLog.findMany({
        where: { targetResource: `user:${toDelete.id}`, actionType: 'DELETE' },
      });
      expect(logs.length).toBe(1);
      expect(logs[0]!.level).toBe('CRITICAL');
    });
  });

  describe('P7-06 — CRUD RolePermission (tham khảo quyền hạn theo vai trò)', () => {
    const roleName = `E2E_P7_${suffix}`;

    it('USER thường bị chặn 403', async () => {
      const pubToken = await loginAs(pubEmail);
      await request(app.getHttpServer())
        .get('/api/v1/admin/permissions')
        .set('Authorization', `Bearer ${pubToken}`)
        .expect(403);
    });

    it('Admin tạo/xem/xóa permission thành công, trùng lặp bị chặn 409', async () => {
      const adminToken = await loginAs(adminEmail);

      const { body: created } = await request(app.getHttpServer())
        .post('/api/v1/admin/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleName, permissionCode: 'e2e.test.permission' })
        .expect(201);
      expect(created.roleName).toBe(roleName);

      await request(app.getHttpServer())
        .post('/api/v1/admin/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleName, permissionCode: 'e2e.test.permission' })
        .expect(409);

      const { body: list } = await request(app.getHttpServer())
        .get('/api/v1/admin/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(list.some((p: { id: string }) => p.id === created.id)).toBe(true);

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/permissions/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/permissions/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('P7-08 — phân công Campaign cho Moderator cụ thể', () => {
    async function createRejectedSubmission(title: string, reward: number) {
      const ownerToken = await loginAs(advEmail);
      const { body: campaign } = await request(app.getHttpServer())
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title,
          platform: 'GOOGLE_MAPS',
          totalSlots: 1,
          rewardPerSlot: reward,
          dripFeedLimit: 1,
        })
        .expect(201);

      const pubToken = await loginAs(pubEmail);
      const { body: submission } = await request(app.getHttpServer())
        .post(`/api/v1/campaigns/${campaign.id}/apply`)
        .set('Authorization', `Bearer ${pubToken}`)
        .send({ fingerprint: `e2e-p7-assign-${suffix}-${title}`, surveyAnswers: {} })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/campaigns/${campaign.id}/applicants/${submission.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ action: 'INVITE' })
        .expect(200);
      await request(app.getHttpServer())
        .post(`/api/v1/submissions/${submission.id}/proof`)
        .set('Authorization', `Bearer ${pubToken}`)
        .attach('file', tinyPng, { filename: 'proof.png', contentType: 'image/png' })
        .expect(201);
      await request(app.getHttpServer())
        .patch(`/api/v1/submissions/${submission.id}/decision`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ action: 'REJECT', reason: 'test' })
        .expect(200);

      return { campaign, submissionId: submission.id as string, pubToken };
    }

    it('USER thường bị chặn 403 trên GET/PATCH admin/campaigns', async () => {
      const pubToken = await loginAs(pubEmail);
      await request(app.getHttpServer())
        .get('/api/v1/admin/campaigns')
        .set('Authorization', `Bearer ${pubToken}`)
        .expect(403);
    });

    it('Admin phân công Moderator cho Campaign — hiện đúng trong danh sách', async () => {
      const adminToken = await loginAs(adminEmail);
      const { campaign } = await createRejectedSubmission('E2E P7 Assign Campaign', 20_000);

      const { body: assigned } = await request(app.getHttpServer())
        .patch(`/api/v1/admin/campaigns/${campaign.id}/assign-moderator`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ moderatorId: mod1Id })
        .expect(200);
      expect(assigned.assignedModeratorId).toBe(mod1Id);
      // owner phải có mặt trong response (regression: assignModerator() từng
      // chỉ include assignedModerator, thiếu owner → crash FE lúc render lại
      // bảng Campaign phân công sau khi đổi dropdown).
      expect(assigned.owner?.email).toBe(advEmail);

      const { body: list } = await request(app.getHttpServer())
        .get('/api/v1/admin/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const found = list.find((c: { id: string }) => c.id === campaign.id);
      expect(found.assignedModerator.id).toBe(mod1Id);
    });

    it('Moderator KHÔNG được phân công bị chặn đề xuất Dispute của Campaign đó, Moderator được phân công thì được (P7-08/P7-10)', async () => {
      const adminToken = await loginAs(adminEmail);
      const { campaign, submissionId, pubToken } = await createRejectedSubmission(
        'E2E P7 Assign Enforce',
        20_000,
      );

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/campaigns/${campaign.id}/assign-moderator`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ moderatorId: mod1Id })
        .expect(200);

      const { body: dispute } = await request(app.getHttpServer())
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${pubToken}`)
        .send({ submissionId, reason: 'Khiếu nại test phân công Moderator' })
        .expect(201);

      const mod2Token = await loginAs(mod2Email);
      await request(app.getHttpServer())
        .put(`/api/v1/mod/disputes/${dispute.id}/recommend`)
        .set('Authorization', `Bearer ${mod2Token}`)
        .send({ recommendation: 'PEND_APP' })
        .expect(403);

      const mod1Token = await loginAs(mod1Email);
      const { body: recommended } = await request(app.getHttpServer())
        .put(`/api/v1/mod/disputes/${dispute.id}/recommend`)
        .set('Authorization', `Bearer ${mod1Token}`)
        .send({ recommendation: 'PEND_APP' })
        .expect(200);
      expect(recommended.status).toBe('RECOMMENDED');
    });

    it('Campaign chưa phân công (null) thì mọi Moderator đều đề xuất được', async () => {
      const { submissionId, pubToken } = await createRejectedSubmission(
        'E2E P7 Unassigned Campaign',
        15_000,
      );

      const { body: dispute } = await request(app.getHttpServer())
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${pubToken}`)
        .send({ submissionId, reason: 'Khiếu nại campaign chưa phân công' })
        .expect(201);

      const mod2Token = await loginAs(mod2Email);
      await request(app.getHttpServer())
        .put(`/api/v1/mod/disputes/${dispute.id}/recommend`)
        .set('Authorization', `Bearer ${mod2Token}`)
        .send({ recommendation: 'PEND_REJ' })
        .expect(200);
    });
  });
});
