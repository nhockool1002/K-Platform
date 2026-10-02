import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Phase 3 — Campaign & Survey. Test case bắt buộc theo TASK.md/PLAN.md DoD:
//  - P3-14: tạo Campaign khi không đủ số dư ví bị chặn đúng thông báo.
//  - P3-15: 1 user ứng tuyển 2 tài khoản khác nhau cùng Campaign bị chặn bởi
//    Fingerprint/IP (chống multi-account).
describe('Campaigns & Survey (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const richAdvertiserEmail = `e2e-adv-rich-${suffix}@kplatform.dev`;
  const poorAdvertiserEmail = `e2e-adv-poor-${suffix}@kplatform.dev`;
  const publisherAEmail = `e2e-pub-a-${suffix}@kplatform.dev`;
  const publisherBEmail = `e2e-pub-b-${suffix}@kplatform.dev`;
  const password = randomBytes(12).toString('hex');

  const seededEmails = [richAdvertiserEmail, poorAdvertiserEmail, publisherAEmail, publisherBEmail];

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

    const richAdvertiser = await prisma.user.create({
      data: { email: richAdvertiserEmail, passwordHash, activeMode: 'A', role: 'USER' },
    });
    await prisma.wallet.create({
      data: { userId: richAdvertiser.id, balanceKpoint: 1_000_000n, reservedKpoint: 0n },
    });

    const poorAdvertiser = await prisma.user.create({
      data: { email: poorAdvertiserEmail, passwordHash, activeMode: 'A', role: 'USER' },
    });
    await prisma.wallet.create({
      data: { userId: poorAdvertiser.id, balanceKpoint: 1_000n, reservedKpoint: 0n },
    });

    await prisma.user.create({
      data: {
        email: publisherAEmail,
        passwordHash,
        activeMode: 'B',
        role: 'USER',
        trustScore: 100,
      },
    });
    await prisma.user.create({
      data: {
        email: publisherBEmail,
        passwordHash,
        activeMode: 'B',
        role: 'USER',
        trustScore: 100,
      },
    });
  });

  afterAll(async () => {
    await prisma.submission.deleteMany({
      where: { publisher: { email: { in: seededEmails } } },
    });
    // Phase 2 retrofit: create() giờ ghi 1 WalletTransaction (CAMPAIGN_RESERVE)
    // cho mỗi Campaign tạo ra — phải xoá trước khi xoá user (FK user_id).
    await prisma.walletTransaction.deleteMany({
      where: { user: { email: { in: seededEmails } } },
    });
    await prisma.campaign.deleteMany({
      where: { owner: { email: { in: seededEmails } } },
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

  it('P3-03/P3-04: tạo Campaign đủ số dư — khoá đúng reserved_kpoint (FN-CAMP-01)', async () => {
    const token = await loginAs(richAdvertiserEmail);

    const res = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'E2E Campaign đủ số dư',
        platform: 'GOOGLE_MAPS',
        totalSlots: 5,
        rewardPerSlot: 20_000,
        dripFeedLimit: 2,
      })
      .expect(201);

    // Tổng = phí tạo 50.000 + (5 slot * 20.000) = 150.000
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.rewardPerSlot).toBe('20000');

    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: {
        userId: (await prisma.user.findUniqueOrThrow({ where: { email: richAdvertiserEmail } })).id,
      },
    });
    expect(wallet.reservedKpoint).toBe(150_000n);
  });

  it('P3-14: tạo Campaign khi không đủ số dư bị chặn đúng thông báo', async () => {
    const token = await loginAs(poorAdvertiserEmail);

    const res = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'E2E Campaign không đủ số dư',
        platform: 'GOOGLE_MAPS',
        totalSlots: 5,
        rewardPerSlot: 20_000,
        dripFeedLimit: 2,
      })
      .expect(400);

    expect(res.body.message).toContain('Số dư khả dụng không đủ');

    // Không có Campaign nào được tạo, ví không bị khoá nhầm.
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: {
        userId: (await prisma.user.findUniqueOrThrow({ where: { email: poorAdvertiserEmail } })).id,
      },
    });
    expect(wallet.reservedKpoint).toBe(0n);
  });

  it('P3-15: 1 thiết bị (fingerprint) ứng tuyển cùng Campaign bằng 2 tài khoản bị chặn', async () => {
    const ownerToken = await loginAs(richAdvertiserEmail);
    const { body: campaign } = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'E2E Campaign chống multi-account',
        platform: 'FACEBOOK',
        totalSlots: 10,
        rewardPerSlot: 15_000,
        dripFeedLimit: 3,
      })
      .expect(201);

    const tokenA = await loginAs(publisherAEmail);
    const tokenB = await loginAs(publisherBEmail);
    const sharedFingerprint = `e2e-shared-device-${suffix}`;

    await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaign.id}/apply`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ fingerprint: sharedFingerprint, surveyAnswers: {} })
      .expect(201);

    const blocked = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaign.id}/apply`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ fingerprint: sharedFingerprint, surveyAnswers: {} })
      .expect(409);

    expect(blocked.body.message).toContain('Thiết bị này');

    const submissions = await prisma.submission.findMany({ where: { campaignId: campaign.id } });
    expect(submissions).toHaveLength(1);
  });

  it('P3-09/P3-12: ứng tuyển rồi được Invite — chỉ chủ Campaign mới Invite/Reject được', async () => {
    const ownerToken = await loginAs(richAdvertiserEmail);
    const { body: campaign } = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'E2E Campaign Invite flow',
        platform: 'SHOPEE',
        totalSlots: 3,
        rewardPerSlot: 25_000,
        dripFeedLimit: 1,
      })
      .expect(201);

    const tokenA = await loginAs(publisherAEmail);
    const { body: submission } = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaign.id}/apply`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ fingerprint: `e2e-invite-flow-${suffix}`, surveyAnswers: { q1: 'ok' } })
      .expect(201);
    expect(submission.status).toBe('APPLIED');

    // Không phải chủ sở hữu — bị chặn 403.
    await request(app.getHttpServer())
      .patch(`/api/v1/campaigns/${campaign.id}/applicants/${submission.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ action: 'INVITE' })
      .expect(403);

    const invited = await request(app.getHttpServer())
      .patch(`/api/v1/campaigns/${campaign.id}/applicants/${submission.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'INVITE' })
      .expect(200);
    expect(invited.body.status).toBe('INVITED');
    // FE render applicant card qua a.publisher.email — thiếu include này từng
    // gây crash "Cannot read properties of undefined (reading 'email')" sau
    // khi Invite/Reject (phát hiện qua QA thủ công trên trình duyệt).
    expect(invited.body.publisher).toMatchObject({ email: publisherAEmail });
  });

  it('P3-13: Campaign chỉ Archive được, không có endpoint xoá', async () => {
    const ownerToken = await loginAs(richAdvertiserEmail);
    const { body: campaign } = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'E2E Campaign Archive',
        platform: 'TIKTOK',
        totalSlots: 1,
        rewardPerSlot: 10_000,
        dripFeedLimit: 1,
      })
      .expect(201);

    await request(app.getHttpServer()).delete(`/api/v1/campaigns/${campaign.id}`).expect(404);

    const archived = await request(app.getHttpServer())
      .patch(`/api/v1/campaigns/${campaign.id}/archive`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(archived.body.status).toBe('ARCHIVED');

    const publicList = await request(app.getHttpServer()).get('/api/v1/campaigns').expect(200);
    expect(publicList.body.find((c: { id: string }) => c.id === campaign.id)).toBeUndefined();
  });
});
