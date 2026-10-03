import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Phase 5 — Dispute Center. Luồng 3 vai trò: Bên B tạo Dispute khi Proof bị
// từ chối → Moderator đề xuất (Pend App/Pend Rej) → Admin phán quyết cuối.
// Test case bắt buộc theo TASK.md DoD:
//  - P5-03: slot bị phong tỏa khi Dispute mở (không mở lại cho ứng viên khác).
//  - P5-10: nhánh "thắng Bên A" — Reject, không đổi ví, slot mở lại.
//  - P5-11: nhánh "thắng Bên B" — Approve, giải phóng KPoint đúng Bên B.
//  - P5-12: Moderator không gọi được trực tiếp API phán quyết cuối (403).
describe('Disputes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tinyPng: Buffer;

  const suffix = Date.now();
  const advertiserEmail = `e2e-disp-adv-${suffix}@kplatform.dev`;
  const publisherEmail = `e2e-disp-pub-${suffix}@kplatform.dev`;
  const modEmail = `e2e-disp-mod-${suffix}@kplatform.dev`;
  const adminEmail = `e2e-disp-admin-${suffix}@kplatform.dev`;
  const password = randomBytes(12).toString('hex');
  const seededEmails = [advertiserEmail, publisherEmail, modEmail, adminEmail];

  beforeAll(async () => {
    tinyPng = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 10, g: 20, b: 30 } },
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
    const advertiser = await prisma.user.create({
      data: {
        email: advertiserEmail,
        passwordHash,
        activeMode: 'A',
        role: 'USER',
        serviceActivatedAt: new Date(),
      },
    });
    await prisma.wallet.create({
      data: { userId: advertiser.id, balanceKpoint: 1_000_000n, reservedKpoint: 0n },
    });
    const publisher = await prisma.user.create({
      data: { email: publisherEmail, passwordHash, activeMode: 'B', role: 'USER', trustScore: 100 },
    });
    await prisma.wallet.create({
      data: { userId: publisher.id, balanceKpoint: 0n, reservedKpoint: 0n },
    });
    await prisma.user.create({
      data: { email: modEmail, passwordHash, activeMode: 'A', role: 'MODERATOR' },
    });
    await prisma.user.create({
      data: { email: adminEmail, passwordHash, activeMode: 'A', role: 'ADMIN' },
    });
  });

  afterAll(async () => {
    await prisma.disputeTicket.deleteMany({
      where: { submission: { publisher: { email: publisherEmail } } },
    });
    await prisma.walletTransaction.deleteMany({ where: { user: { email: { in: seededEmails } } } });
    await prisma.submission.deleteMany({ where: { publisher: { email: publisherEmail } } });
    await prisma.campaign.deleteMany({ where: { owner: { email: advertiserEmail } } });
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

  // Dựng 1 Campaign (1 slot) + ứng tuyển + Invite + nộp Proof + Bên A từ chối
  // → trả về submission đang ở status REJECTED, sẵn sàng để Bên B tạo Dispute.
  async function createRejectedSubmission(title: string, reward: number) {
    const ownerToken = await loginAs(advertiserEmail);
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

    const pubToken = await loginAs(publisherEmail);
    const { body: submission } = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaign.id}/apply`)
      .set('Authorization', `Bearer ${pubToken}`)
      .send({ fingerprint: `e2e-disp-${suffix}-${title}`, surveyAnswers: {} })
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
      .send({ action: 'REJECT', reason: 'Ảnh mờ, không đọc được hóa đơn' })
      .expect(200);

    return { campaign, submissionId: submission.id as string, ownerToken, pubToken };
  }

  it('Bên B tạo Dispute — chuyển OPEN, submission → DISPUTED, slot bị phong tỏa (P5-03)', async () => {
    const { campaign, submissionId, pubToken } = await createRejectedSubmission(
      'E2E Dispute Freeze Slot',
      50_000,
    );

    const { body: dispute } = await request(app.getHttpServer())
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${pubToken}`)
      .send({ submissionId, reason: 'Ảnh của tôi rõ nét, link review công khai vẫn truy cập được' })
      .expect(201);
    expect(dispute.status).toBe('OPEN');
    expect(dispute.submissionId).toBe(submissionId);

    const { body: sub } = await request(app.getHttpServer())
      .get(`/api/v1/submissions/${submissionId}`)
      .set('Authorization', `Bearer ${pubToken}`)
      .expect(200);
    expect(sub.status).toBe('DISPUTED');

    // Slot đã bị phong tỏa (campaign chỉ có 1 slot, đang DISPUTED) — Campaign
    // public listing phải báo hết slot, không cho ứng viên khác chiếm chỗ.
    const { body: publicCampaign } = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${campaign.id}`)
      .expect(200);
    expect(publicCampaign.slotsFilled).toBe(1);

    // Tạo Dispute lần 2 cho cùng submission phải bị chặn — submission giờ đã
    // là DISPUTED (không còn REJECTED) nên guard trạng thái chặn trước khi
    // kịp chạm constraint unique([submissionId]) ở DB.
    await request(app.getHttpServer())
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${pubToken}`)
      .send({ submissionId, reason: 'Thử tạo lại lần nữa' })
      .expect(400);
  });

  it('Moderator đề xuất → RECOMMENDED; USER thường/Moderator không gọi được resolve (P5-12)', async () => {
    const { submissionId, pubToken } = await createRejectedSubmission(
      'E2E Dispute Recommend Flow',
      40_000,
    );
    const modToken = await loginAs(modEmail);
    const adminToken = await loginAs(adminEmail);

    const { body: dispute } = await request(app.getHttpServer())
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${pubToken}`)
      .send({ submissionId, reason: 'Khiếu nại quyết định từ chối' })
      .expect(201);

    // USER thường (Bên B) không có quyền xem CMS Dispute Center.
    await request(app.getHttpServer())
      .get('/api/v1/mod/disputes')
      .set('Authorization', `Bearer ${pubToken}`)
      .expect(403);

    // Resolve trước khi có đề xuất phải bị chặn.
    await request(app.getHttpServer())
      .post(`/api/v1/admin/disputes/${dispute.id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVE' })
      .expect(400);

    const { body: recommended } = await request(app.getHttpServer())
      .put(`/api/v1/mod/disputes/${dispute.id}/recommend`)
      .set('Authorization', `Bearer ${modToken}`)
      .send({ recommendation: 'PEND_APP' })
      .expect(200);
    expect(recommended.status).toBe('RECOMMENDED');
    expect(recommended.modRecommendation).toBe('PEND_APP');

    // P5-12 — Moderator KHÔNG được gọi route phán quyết cuối của Admin.
    await request(app.getHttpServer())
      .post(`/api/v1/admin/disputes/${dispute.id}/resolve`)
      .set('Authorization', `Bearer ${modToken}`)
      .send({ decision: 'APPROVE' })
      .expect(403);
  });

  it('Admin resolve APPROVE — thắng Bên B: trả thưởng đúng, submission APPROVED (P5-11)', async () => {
    const { submissionId, pubToken } = await createRejectedSubmission(
      'E2E Dispute Resolve Approve',
      70_000,
    );
    const modToken = await loginAs(modEmail);
    const adminToken = await loginAs(adminEmail);

    const { body: dispute } = await request(app.getHttpServer())
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${pubToken}`)
      .send({ submissionId, reason: 'Tôi chắc chắn mình đúng' })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/v1/mod/disputes/${dispute.id}/recommend`)
      .set('Authorization', `Bearer ${modToken}`)
      .send({ recommendation: 'PEND_APP' })
      .expect(200);

    const { body: resolved } = await request(app.getHttpServer())
      .post(`/api/v1/admin/disputes/${dispute.id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVE' })
      .expect(200);
    expect(resolved.resolved).toBe(true);

    const { body: sub } = await request(app.getHttpServer())
      .get(`/api/v1/submissions/${submissionId}`)
      .set('Authorization', `Bearer ${pubToken}`)
      .expect(200);
    expect(sub.status).toBe('APPROVED');

    const { body: wallet } = await request(app.getHttpServer())
      .get('/api/v1/payments/wallet')
      .set('Authorization', `Bearer ${pubToken}`)
      .expect(200);
    expect(wallet.balanceKpoint).toBe('70000');

    // Resolve lại 1 Dispute đã RESOLVED phải bị chặn.
    await request(app.getHttpServer())
      .post(`/api/v1/admin/disputes/${dispute.id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVE' })
      .expect(400);
  });

  it('Admin resolve REJECT — thắng Bên A: ví không đổi, submission REJECTED, slot mở lại (P5-10)', async () => {
    const { campaign, submissionId, pubToken } = await createRejectedSubmission(
      'E2E Dispute Resolve Reject',
      30_000,
    );
    const modToken = await loginAs(modEmail);
    const adminToken = await loginAs(adminEmail);

    const { body: walletBefore } = await request(app.getHttpServer())
      .get('/api/v1/payments/wallet')
      .set('Authorization', `Bearer ${pubToken}`)
      .expect(200);

    const { body: dispute } = await request(app.getHttpServer())
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${pubToken}`)
      .send({ submissionId, reason: 'Khiếu nại nhưng sẽ thua' })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/v1/mod/disputes/${dispute.id}/recommend`)
      .set('Authorization', `Bearer ${modToken}`)
      .send({ recommendation: 'PEND_REJ' })
      .expect(200);

    const { body: resolved } = await request(app.getHttpServer())
      .post(`/api/v1/admin/disputes/${dispute.id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'REJECT' })
      .expect(200);
    expect(resolved.resolved).toBe(true);

    const { body: sub } = await request(app.getHttpServer())
      .get(`/api/v1/submissions/${submissionId}`)
      .set('Authorization', `Bearer ${pubToken}`)
      .expect(200);
    expect(sub.status).toBe('REJECTED');

    const { body: walletAfter } = await request(app.getHttpServer())
      .get('/api/v1/payments/wallet')
      .set('Authorization', `Bearer ${pubToken}`)
      .expect(200);
    expect(walletAfter.balanceKpoint).toBe(walletBefore.balanceKpoint);

    // Slot mở lại — campaign (1 slot) giờ phải báo còn trống cho ứng viên khác.
    const { body: publicCampaign } = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${campaign.id}`)
      .expect(200);
    expect(publicCampaign.slotsFilled).toBe(0);
  });

  it('Chỉ có thể tạo Dispute khi Proof đang REJECTED (không phải PENDING/APPROVED)', async () => {
    const ownerToken = await loginAs(advertiserEmail);
    const { body: campaign } = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'E2E Dispute Guard Status',
        platform: 'GOOGLE_MAPS',
        totalSlots: 1,
        rewardPerSlot: 20_000,
        dripFeedLimit: 1,
      })
      .expect(201);
    const pubToken = await loginAs(publisherEmail);
    const { body: submission } = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaign.id}/apply`)
      .set('Authorization', `Bearer ${pubToken}`)
      .send({ fingerprint: `e2e-disp-guard-${suffix}`, surveyAnswers: {} })
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

    // Status hiện là PENDING — chưa bị từ chối, không thể tạo Dispute.
    await request(app.getHttpServer())
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${pubToken}`)
      .send({ submissionId: submission.id, reason: 'Tạo dispute khi chưa bị từ chối' })
      .expect(400);
  });
});
