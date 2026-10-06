import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// CMS SCR-21 (chi tiết & lưu trữ Campaign), SCR-22 (duyệt Proof thủ công),
// SCR-23 (ví & sổ cái), SCR-24 (chống gian lận), SCR-25 (giám sát vận hành).
describe('CMS SCR-21..25 (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const adminEmail = `e2e-scr25-admin-${suffix}@kplatform.dev`;
  const userEmail = `e2e-scr25-user-${suffix}@kplatform.dev`;
  const ownerEmail = `e2e-scr25-owner-${suffix}@kplatform.dev`;
  const pubOneEmail = `e2e-scr25-pub1-${suffix}@kplatform.dev`;
  const pubTwoEmail = `e2e-scr25-pub2-${suffix}@kplatform.dev`;
  const password = randomBytes(12).toString('hex');
  const seededEmails = [adminEmail, userEmail, ownerEmail, pubOneEmail, pubTwoEmail];

  let adminId: string;
  let userToken: string;
  let adminToken: string;
  let ownerId: string;
  let pubOneId: string;
  let pubTwoId: string;

  // Mọi campaign seed trong test này, để dọn đúng khi afterAll.
  const campaignIds: string[] = [];

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
    const admin = await prisma.user.create({
      data: { email: adminEmail, passwordHash, activeMode: 'A', role: 'ADMIN' },
    });
    adminId = admin.id;
    await prisma.user.create({
      data: { email: userEmail, passwordHash, activeMode: 'B', role: 'USER' },
    });
    const owner = await prisma.user.create({
      data: {
        email: ownerEmail,
        passwordHash,
        activeMode: 'A',
        role: 'USER',
        serviceActivatedAt: new Date(),
      },
    });
    ownerId = owner.id;
    const pubOne = await prisma.user.create({
      data: { email: pubOneEmail, passwordHash, activeMode: 'B', role: 'USER' },
    });
    pubOneId = pubOne.id;
    const pubTwo = await prisma.user.create({
      data: { email: pubTwoEmail, passwordHash, activeMode: 'B', role: 'USER' },
    });
    pubTwoId = pubTwo.id;

    // Ví chủ Campaign: 1.000.000 KPoint, 80.000 đang ký quỹ cho campaign đầu tiên.
    await prisma.wallet.create({
      data: { userId: ownerId, balanceKpoint: 1_000_000n, reservedKpoint: 0n },
    });
    for (const u of [pubOneId, pubTwoId]) {
      await prisma.wallet.create({ data: { userId: u, balanceKpoint: 0n, reservedKpoint: 0n } });
    }

    adminToken = await loginAs(adminEmail);
    userToken = await loginAs(userEmail);
  });

  afterAll(async () => {
    const seeded = await prisma.user.findMany({
      where: { email: { in: seededEmails } },
      select: { id: true },
    });
    const seededIds = seeded.map((u) => u.id);
    await prisma.submission.deleteMany({ where: { campaignId: { in: campaignIds } } });
    await prisma.walletTransaction.deleteMany({
      where: { user: { email: { in: seededEmails } } },
    });
    await prisma.trustScoreTransaction.deleteMany({
      where: { OR: [{ userId: { in: seededIds } }, { actorId: { in: seededIds } }] },
    });
    await prisma.campaign.deleteMany({ where: { id: { in: campaignIds } } });
    await prisma.wallet.deleteMany({ where: { user: { email: { in: seededEmails } } } });
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

  // Tạo campaign trực tiếp qua Prisma và set ký quỹ đúng như CampaignsService.create.
  async function seedCampaign(totalSlots: number, rewardPerSlot: number, reservedExtra = 0) {
    const campaign = await prisma.campaign.create({
      data: {
        ownerId,
        title: `E2E SCR-25 campaign ${randomBytes(3).toString('hex')}`,
        platform: 'GOOGLE_MAPS',
        totalSlots,
        rewardPerSlot: BigInt(rewardPerSlot),
        dripFeedLimit: 5,
      },
    });
    campaignIds.push(campaign.id);
    await prisma.wallet.update({
      where: { userId: ownerId },
      data: { reservedKpoint: { increment: BigInt(totalSlots * rewardPerSlot + reservedExtra) } },
    });
    return campaign;
  }

  async function seedSubmission(
    campaignId: string,
    publisherId: string,
    data: Partial<{
      status: 'APPLIED' | 'INVITED' | 'PENDING' | 'APPROVED' | 'REJECTED';
      proofUrl: string | null;
      watermarkUrl: string | null;
      ip: string | null;
      fingerprintHash: string | null;
      updatedAt: Date;
    }> = {},
  ) {
    return prisma.submission.create({
      data: {
        campaignId,
        publisherId,
        status: data.status ?? 'INVITED',
        proofUrl: data.proofUrl ?? null,
        watermarkUrl: data.watermarkUrl ?? null,
        ip: data.ip ?? null,
        fingerprintHash: data.fingerprintHash ?? null,
        ...(data.updatedAt ? { updatedAt: data.updatedAt } : {}),
      },
    });
  }

  describe('SCR-21 · chi tiết & lưu trữ Campaign', () => {
    it('USER thường bị chặn 403 khi xem chi tiết', async () => {
      const c = await seedCampaign(3, 10_000, 50_000);
      await request(app.getHttpServer())
        .get(`/api/v1/admin/campaigns/${c.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('chi tiết trả về số slot đã chiếm và số KPoint hoàn được', async () => {
      const c = await seedCampaign(3, 10_000);
      await seedSubmission(c.id, pubOneId, { status: 'INVITED' });
      await seedSubmission(c.id, pubTwoId, { status: 'APPLIED' });

      const { body } = await request(app.getHttpServer())
        .get(`/api/v1/admin/campaigns/${c.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      // 3 slot, 1 đã INVITED (chiếm), APPLIED không chiếm → hoàn 2 slot × 10.000.
      expect(body.slotsOccupied).toBe(1);
      expect(body.refundableKpoint).toBe('20000');
    });

    it('sửa thông tin hiển thị, không cho sửa rewardPerSlot', async () => {
      const c = await seedCampaign(2, 10_000);
      const { body } = await request(app.getHttpServer())
        .patch(`/api/v1/admin/campaigns/${c.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Tiêu đề đã sửa bởi admin', minTrustScore: 40 })
        .expect(200);
      expect(body.title).toBe('Tiêu đề đã sửa bởi admin');
      expect(body.minTrustScore).toBe(40);
      expect(body.rewardPerSlot).toBe('10000');

      // rewardPerSlot không nằm trong DTO nên bị whitelist lọc bỏ; giá trị giữ nguyên.
      const ignored = await request(app.getHttpServer())
        .patch(`/api/v1/admin/campaigns/${c.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rewardPerSlot: 1 })
        .expect(200);
      expect(ignored.body.rewardPerSlot).toBe('10000');
    });

    it('lưu trữ: hoàn ký quỹ slot chưa dùng, không đổi balance, lần 2 bị chặn', async () => {
      const c = await seedCampaign(3, 10_000);
      await seedSubmission(c.id, pubOneId, { status: 'PENDING', proofUrl: 'p.jpg' });

      const before = await prisma.wallet.findUniqueOrThrow({ where: { userId: ownerId } });
      const { body } = await request(app.getHttpServer())
        .patch(`/api/v1/admin/campaigns/${c.id}/archive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 3 slot, 1 PENDING (chiếm) → hoàn 2 × 10.000.
      expect(body.status).toBe('ARCHIVED');
      expect(body.refundedKpoint).toBe('20000');
      expect(body.refundedSlots).toBe(2);

      const after = await prisma.wallet.findUniqueOrThrow({ where: { userId: ownerId } });
      expect(after.balanceKpoint).toBe(before.balanceKpoint);
      expect(after.reservedKpoint).toBe(before.reservedKpoint - 20_000n);

      const tx = await prisma.walletTransaction.findFirst({
        where: { relatedCampaignId: c.id, type: 'CAMPAIGN_REFUND' },
      });
      expect(tx?.reservedDeltaKpoint).toBe(-20_000n);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/campaigns/${c.id}/archive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('Invite ứng viên bị chặn sau khi Campaign đã lưu trữ', async () => {
      const c = await seedCampaign(2, 10_000);
      const applicant = await prisma.submission.create({
        data: { campaignId: c.id, publisherId: pubTwoId, status: 'APPLIED' },
      });
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/campaigns/${c.id}/archive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const ownerToken = await loginAs(ownerEmail);
      await request(app.getHttpServer())
        .patch(`/api/v1/campaigns/${c.id}/applicants/${applicant.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ action: 'INVITE' })
        .expect(400);
    });
  });

  describe('SCR-22 · duyệt Proof thủ công', () => {
    it('USER thường bị chặn 403 khi xem hàng đợi Proof', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/submissions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('Admin duyệt Proof PENDING: trả thưởng cho Bên B, không cần là chủ Campaign', async () => {
      const c = await seedCampaign(2, 10_000);
      const sub = await seedSubmission(c.id, pubOneId, {
        status: 'PENDING',
        proofUrl: 'proof.jpg',
        watermarkUrl: 'wm.jpg',
      });
      const pubBefore = await prisma.wallet.findUniqueOrThrow({ where: { userId: pubOneId } });

      const { body } = await request(app.getHttpServer())
        .patch(`/api/v1/admin/submissions/${sub.id}/decision`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'APPROVE' })
        .expect(200);
      expect(body.status).toBe('APPROVED');

      const pubAfter = await prisma.wallet.findUniqueOrThrow({ where: { userId: pubOneId } });
      expect(pubAfter.balanceKpoint - pubBefore.balanceKpoint).toBe(10_000n);

      // Quyết định lại một Proof đã xử lý bị chặn.
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/submissions/${sub.id}/decision`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'REJECT', reason: 'thử lại' })
        .expect(400);
    });

    it('Admin từ chối Proof PENDING kèm lý do', async () => {
      const c = await seedCampaign(2, 10_000);
      const sub = await seedSubmission(c.id, pubOneId, {
        status: 'PENDING',
        proofUrl: 'proof.jpg',
        watermarkUrl: 'wm.jpg',
      });
      const { body } = await request(app.getHttpServer())
        .patch(`/api/v1/admin/submissions/${sub.id}/decision`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'REJECT', reason: 'Ảnh không đúng địa điểm' })
        .expect(200);
      expect(body.status).toBe('REJECTED');
      expect(body.rejectReason).toBe('Ảnh không đúng địa điểm');
    });

    it('lọc watermark kẹt: chỉ lấy Proof đã nộp, chưa có watermark, quá 10 phút', async () => {
      const c = await seedCampaign(2, 10_000);
      const stuck = await seedSubmission(c.id, pubTwoId, {
        status: 'PENDING',
        proofUrl: 'raw.jpg',
        watermarkUrl: null,
        updatedAt: new Date(Date.now() - 30 * 60 * 1000),
      });
      const fresh = await seedSubmission(c.id, pubOneId, {
        status: 'PENDING',
        proofUrl: 'raw2.jpg',
        watermarkUrl: null,
      });

      const { body } = await request(app.getHttpServer())
        .get('/api/v1/admin/submissions?stuckWatermark=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const ids = (body as { id: string }[]).map((s) => s.id);
      expect(ids).toContain(stuck.id);
      expect(ids).not.toContain(fresh.id);
    });
  });

  describe('SCR-23 · ví & sổ cái', () => {
    it('tra cứu ví theo email và xem lịch sử giao dịch', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/api/v1/admin/wallets?search=${encodeURIComponent(ownerEmail)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0].user.email).toBe(ownerEmail);
      expect(typeof body[0].availableKpoint).toBe('string');

      await request(app.getHttpServer())
        .get(`/api/v1/admin/wallets/${ownerId}/transactions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('điều chỉnh cộng tiền ghi sổ ADJUSTMENT có lý do', async () => {
      const before = await prisma.wallet.findUniqueOrThrow({ where: { userId: pubOneId } });
      await request(app.getHttpServer())
        .post(`/api/v1/admin/wallets/${pubOneId}/adjustments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ deltaKpoint: 5000, reason: 'Bồi hoàn lỗi ghi nhận' })
        .expect(201);

      const after = await prisma.wallet.findUniqueOrThrow({ where: { userId: pubOneId } });
      expect(after.balanceKpoint - before.balanceKpoint).toBe(5_000n);
      const tx = await prisma.walletTransaction.findFirst({
        where: { userId: pubOneId, type: 'ADJUSTMENT' },
      });
      expect(tx?.balanceDeltaKpoint).toBe(5_000n);
    });

    it('không cho trừ xuống dưới KPoint đang ký quỹ', async () => {
      const owner = await prisma.wallet.findUniqueOrThrow({ where: { userId: ownerId } });
      // Trừ đúng 1 KPoint nhiều hơn phần khả dụng → số dư còn lại thấp hơn ký quỹ.
      const overdraw = Number(owner.balanceKpoint - owner.reservedKpoint + 1n);
      await request(app.getHttpServer())
        .post(`/api/v1/admin/wallets/${ownerId}/adjustments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ deltaKpoint: -overdraw, reason: 'Trừ quá tay' })
        .expect(400);
    });

    it('từ chối delta = 0 và lý do quá ngắn', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/admin/wallets/${pubOneId}/adjustments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ deltaKpoint: 0, reason: 'không có ý nghĩa' })
        .expect(400);
      await request(app.getHttpServer())
        .post(`/api/v1/admin/wallets/${pubOneId}/adjustments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ deltaKpoint: 100, reason: 'ab' })
        .expect(400);
    });
  });

  describe('SCR-24 · chống gian lận', () => {
    it('phát hiện 2 Bên B khác nhau cùng IP trong 1 Campaign', async () => {
      const c = await seedCampaign(4, 10_000);
      const ip = `10.99.${suffix % 200}.7`;
      await seedSubmission(c.id, pubOneId, { status: 'INVITED', ip });
      await seedSubmission(c.id, pubTwoId, { status: 'INVITED', ip });

      const { body } = await request(app.getHttpServer())
        .get('/api/v1/admin/fraud/clusters')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const cluster = (
        body as { kind: string; campaignId: string; signal: string; publishers: { id: string }[] }[]
      ).find((x) => x.kind === 'IP' && x.campaignId === c.id && x.signal === ip);
      expect(cluster).toBeDefined();
      expect(cluster?.publishers.map((p) => p.id).sort()).toEqual([pubOneId, pubTwoId].sort());
    });

    it('khoá tài khoản người dùng thường, không cho khoá Admin hoặc chính mình', async () => {
      const { body } = await request(app.getHttpServer())
        .patch(`/api/v1/admin/fraud/users/${pubTwoId}/disabled`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ disabled: true })
        .expect(200);
      expect(body.disabledAt).not.toBeNull();

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/fraud/users/${pubTwoId}/disabled`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ disabled: false })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/fraud/users/${adminId}/disabled`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ disabled: true })
        .expect(400);
    });
  });

  describe('SCR-25 · giám sát vận hành', () => {
    it('trả về trạng thái hàng đợi watermark và các chỉ số kẹt', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/v1/admin/ops/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(typeof body.watermarkQueue.waiting).toBe('number');
      expect(Array.isArray(body.failedJobs)).toBe(true);
      expect(typeof body.overdueAutoApprove).toBe('number');
      expect(typeof body.stuckWatermark).toBe('number');
      expect(typeof body.serverErrors24h).toBe('number');
    });

    it('USER thường bị chặn 403 khi thử lại job', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/ops/watermark/retry-failed')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('Admin thử lại job watermark lỗi', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/v1/admin/ops/watermark/retry-failed')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      expect(typeof body.retryRequested).toBe('number');
    });
  });
});
