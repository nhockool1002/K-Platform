import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { SubmissionsService } from '../src/submissions/submissions.service.js';

// PNG 20x20 hợp lệ thật (sinh bằng sharp, không phải base64 tay) — dùng làm
// file Proof giả cho test upload thật, không mock multer/disk, file này thực
// sự được ghi ra backend/uploads/ và chạy qua watermark.processor.ts thật.
let TINY_PNG: Buffer;

async function waitForWatermark(
  app: INestApplication<App>,
  token: string,
  submissionId: string,
  timeoutMs = 15_000,
): Promise<{ watermarkUrl: string | null; status: string }> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { body } = await request(app.getHttpServer())
      .get(`/api/v1/submissions/${submissionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    if (body.watermarkUrl || Date.now() > deadline) return body;
    await new Promise((r) => setTimeout(r, 300));
  }
}

// Phase 4 — Submission, Proof & Auto-Approve. Test case bắt buộc theo
// TASK.md DoD:
//  - P4-12: Watermark xuất hiện đúng trên ảnh Proof (video cần ffmpeg thật,
//    xác minh thủ công qua Docker build — xem PR description).
//  - P4-13: approve() idempotent — gọi lặp không trả thưởng 2 lần.
describe('Submissions & Proof (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let submissionsService: SubmissionsService;

  const suffix = Date.now();
  const advertiserEmail = `e2e-sub-adv-${suffix}@kplatform.dev`;
  const otherAdvertiserEmail = `e2e-sub-adv-other-${suffix}@kplatform.dev`;
  const publisherEmail = `e2e-sub-pub-${suffix}@kplatform.dev`;
  const password = randomBytes(12).toString('hex');
  const seededEmails = [advertiserEmail, otherAdvertiserEmail, publisherEmail];

  beforeAll(async () => {
    TINY_PNG = await sharp({
      create: { width: 20, height: 20, channels: 3, background: { r: 100, g: 150, b: 200 } },
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
    submissionsService = app.get(SubmissionsService);

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
    const otherAdvertiser = await prisma.user.create({
      data: {
        email: otherAdvertiserEmail,
        passwordHash,
        activeMode: 'A',
        role: 'USER',
        serviceActivatedAt: new Date(),
      },
    });
    await prisma.wallet.create({
      data: { userId: otherAdvertiser.id, balanceKpoint: 1_000_000n, reservedKpoint: 0n },
    });
    const publisher = await prisma.user.create({
      data: { email: publisherEmail, passwordHash, activeMode: 'B', role: 'USER', trustScore: 100 },
    });
    await prisma.wallet.create({
      data: { userId: publisher.id, balanceKpoint: 0n, reservedKpoint: 0n },
    });
  });

  afterAll(async () => {
    await prisma.walletTransaction.deleteMany({ where: { user: { email: { in: seededEmails } } } });
    await prisma.submission.deleteMany({ where: { publisher: { email: publisherEmail } } });
    await prisma.campaign.deleteMany({ where: { owner: { email: { in: seededEmails } } } });
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

  async function createInvitedSubmission(ownerToken: string, title: string, reward: number) {
    const { body: campaign } = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title,
        platform: 'GOOGLE_MAPS',
        totalSlots: 3,
        rewardPerSlot: reward,
        dripFeedLimit: 1,
      })
      .expect(201);

    const pubToken = await loginAs(publisherEmail);
    const { body: submission } = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaign.id}/apply`)
      .set('Authorization', `Bearer ${pubToken}`)
      .send({ fingerprint: `e2e-proof-${suffix}-${title}`, surveyAnswers: {} })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/campaigns/${campaign.id}/applicants/${submission.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'INVITE' })
      .expect(200);

    return { campaign, submissionId: submission.id as string, pubToken };
  }

  it('P4-02/03/04/05/12: nộp Proof ảnh → chuyển PENDING, Watermark xử lý xong qua Queue', async () => {
    const ownerToken = await loginAs(advertiserEmail);
    const { submissionId, pubToken } = await createInvitedSubmission(
      ownerToken,
      'E2E Proof Watermark',
      50_000,
    );

    const { body: submitted } = await request(app.getHttpServer())
      .post(`/api/v1/submissions/${submissionId}/proof`)
      .set('Authorization', `Bearer ${pubToken}`)
      .field('reviewUrl', 'https://maps.app.goo.gl/abc123')
      .field('reviewNote', 'Review rất tốt')
      .attach('file', TINY_PNG, { filename: 'proof.png', contentType: 'image/png' })
      .expect(201);

    expect(submitted.status).toBe('PENDING');
    expect(submitted.proofUrl).toMatch(/^\/uploads\/proofs\//);
    expect(submitted.autoApproveAt).toBeTruthy();

    const final = await waitForWatermark(app, pubToken, submissionId);
    expect(final.watermarkUrl).toMatch(/^\/uploads\/watermarked\//);
  }, 20_000);

  it('Nộp Proof khi chưa được Invite (còn APPLIED) bị chặn 400', async () => {
    const ownerToken = await loginAs(advertiserEmail);
    const { body: campaign } = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'E2E Not Invited',
        platform: 'GOOGLE_MAPS',
        totalSlots: 3,
        rewardPerSlot: 50_000,
        dripFeedLimit: 1,
      })
      .expect(201);
    const pubToken = await loginAs(publisherEmail);
    const { body: submission } = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaign.id}/apply`)
      .set('Authorization', `Bearer ${pubToken}`)
      .send({ fingerprint: `e2e-not-invited-${suffix}`, surveyAnswers: {} })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/submissions/${submission.id}/proof`)
      .set('Authorization', `Bearer ${pubToken}`)
      .attach('file', TINY_PNG, { filename: 'proof.png', contentType: 'image/png' })
      .expect(400);
  });

  it('P4-10: chủ Campaign khác không được duyệt Proof; chủ thật Approve → trả thưởng đúng, ghi ledger', async () => {
    const ownerToken = await loginAs(advertiserEmail);
    const { submissionId, pubToken } = await createInvitedSubmission(
      ownerToken,
      'E2E Proof Approve Payout',
      40_000,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/submissions/${submissionId}/proof`)
      .set('Authorization', `Bearer ${pubToken}`)
      .attach('file', TINY_PNG, { filename: 'proof.png', contentType: 'image/png' })
      .expect(201);

    const otherOwnerToken = await loginAs(otherAdvertiserEmail);
    await request(app.getHttpServer())
      .patch(`/api/v1/submissions/${submissionId}/decision`)
      .set('Authorization', `Bearer ${otherOwnerToken}`)
      .send({ action: 'APPROVE' })
      .expect(403);

    const advertiser = await prisma.user.findUniqueOrThrow({ where: { email: advertiserEmail } });
    const publisher = await prisma.user.findUniqueOrThrow({ where: { email: publisherEmail } });
    const walletsBefore = await prisma.wallet.findMany({
      where: { userId: { in: [advertiser.id, publisher.id] } },
    });
    const advBefore = walletsBefore.find((w) => w.userId === advertiser.id)!;
    const pubBefore = walletsBefore.find((w) => w.userId === publisher.id)!;

    const { body: decided } = await request(app.getHttpServer())
      .patch(`/api/v1/submissions/${submissionId}/decision`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'APPROVE' })
      .expect(200);
    expect(decided.status).toBe('APPROVED');

    const walletsAfter = await prisma.wallet.findMany({
      where: { userId: { in: [advertiser.id, publisher.id] } },
    });
    const advAfter = walletsAfter.find((w) => w.userId === advertiser.id)!;
    const pubAfter = walletsAfter.find((w) => w.userId === publisher.id)!;

    expect(advAfter.balanceKpoint).toBe(advBefore.balanceKpoint - 40_000n);
    expect(advAfter.reservedKpoint).toBe(advBefore.reservedKpoint - 40_000n);
    expect(pubAfter.balanceKpoint).toBe(pubBefore.balanceKpoint + 40_000n);

    const ledger = await prisma.walletTransaction.findMany({
      where: { relatedCampaignId: decided.campaignId, type: 'TASK_REWARD' },
    });
    expect(ledger.length).toBe(2);
    expect(ledger.find((l) => l.userId === advertiser.id)?.balanceDeltaKpoint).toBe(-40_000n);
    expect(ledger.find((l) => l.userId === publisher.id)?.balanceDeltaKpoint).toBe(40_000n);
  }, 20_000);

  it('P4-13: approve() gọi lặp (giả lập cron trùng Bên A bấm Approve) không trả thưởng 2 lần', async () => {
    const ownerToken = await loginAs(advertiserEmail);
    const { submissionId, pubToken } = await createInvitedSubmission(
      ownerToken,
      'E2E Proof Double Approve',
      25_000,
    );
    await request(app.getHttpServer())
      .post(`/api/v1/submissions/${submissionId}/proof`)
      .set('Authorization', `Bearer ${pubToken}`)
      .attach('file', TINY_PNG, { filename: 'proof.png', contentType: 'image/png' })
      .expect(201);

    const publisher = await prisma.user.findUniqueOrThrow({ where: { email: publisherEmail } });
    const before = await prisma.wallet.findUniqueOrThrow({ where: { userId: publisher.id } });

    const first = await submissionsService.approve(submissionId);
    const second = await submissionsService.approve(submissionId);
    expect(first).not.toBeNull();
    expect(second).toBeNull(); // Đã APPROVED từ lần gọi đầu — không xử lý lại.

    const after = await prisma.wallet.findUniqueOrThrow({ where: { userId: publisher.id } });
    expect(after.balanceKpoint).toBe(before.balanceKpoint + 25_000n); // Chỉ +1 lần, không phải +2.
  }, 20_000);

  it('Từ chối Proof (REJECT) không thay đổi ví của ai', async () => {
    const ownerToken = await loginAs(advertiserEmail);
    const { submissionId, pubToken } = await createInvitedSubmission(
      ownerToken,
      'E2E Proof Reject',
      30_000,
    );
    await request(app.getHttpServer())
      .post(`/api/v1/submissions/${submissionId}/proof`)
      .set('Authorization', `Bearer ${pubToken}`)
      .attach('file', TINY_PNG, { filename: 'proof.png', contentType: 'image/png' })
      .expect(201);

    const advertiser = await prisma.user.findUniqueOrThrow({ where: { email: advertiserEmail } });
    const before = await prisma.wallet.findUniqueOrThrow({ where: { userId: advertiser.id } });

    const { body: decided } = await request(app.getHttpServer())
      .patch(`/api/v1/submissions/${submissionId}/decision`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'REJECT' })
      .expect(200);
    expect(decided.status).toBe('REJECTED');

    const after = await prisma.wallet.findUniqueOrThrow({ where: { userId: advertiser.id } });
    expect(after.balanceKpoint).toBe(before.balanceKpoint);
    expect(after.reservedKpoint).toBe(before.reservedKpoint);
  });
});
