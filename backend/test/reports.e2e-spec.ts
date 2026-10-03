import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// issue #55 — CMS "Thống kê doanh thu". Test case:
//  - RBAC: USER thường/Moderator bị chặn 403, chỉ Admin/Root Admin xem được.
//  - Doanh thu = đúng (campaignCount × 50.000) + phí kích hoạt thật đã trừ.
//  - Escrow snapshot + top-10 lists tính đúng theo dữ liệu seed.
describe('Reports — Thống kê doanh thu (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const adminEmail = `e2e-report-admin-${suffix}@kplatform.dev`;
  const modEmail = `e2e-report-mod-${suffix}@kplatform.dev`;
  const advEmail = `e2e-report-adv-${suffix}@kplatform.dev`;
  const pubEmail = `e2e-report-pub-${suffix}@kplatform.dev`;
  const password = randomBytes(12).toString('hex');
  const seededEmails = [adminEmail, modEmail, advEmail, pubEmail];

  let advUserId: string;
  let pubUserId: string;

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
    await prisma.user.create({
      data: { email: modEmail, passwordHash, activeMode: 'A', role: 'MODERATOR' },
    });
    const adv = await prisma.user.create({
      data: { email: advEmail, passwordHash, activeMode: 'A', role: 'USER' },
    });
    advUserId = adv.id;
    await prisma.wallet.create({
      data: { userId: adv.id, balanceKpoint: 1_000_000n, reservedKpoint: 0n },
    });
    const pub = await prisma.user.create({
      data: { email: pubEmail, passwordHash, activeMode: 'B', role: 'USER' },
    });
    pubUserId = pub.id;
    await prisma.wallet.create({
      data: { userId: pub.id, balanceKpoint: 0n, reservedKpoint: 0n },
    });

    // Fixture ledger: 1 lần nạp KPoint (TOPUP_SEPAY) + 1 lần nhận thưởng
    // (TASK_REWARD side=B) cho publisher — chèn thẳng qua Prisma, không cần
    // chạy lại toàn bộ webhook SePay/luồng Submission thật (đã test riêng ở
    // payments.e2e-spec.ts / submissions.e2e-spec.ts).
    await prisma.walletTransaction.create({
      data: {
        userId: pub.id,
        type: 'TOPUP_SEPAY',
        side: 'SHARED',
        balanceDeltaKpoint: 200_000n,
        txnId: `e2e-report-topup-${suffix}`,
      },
    });
    await prisma.walletTransaction.create({
      data: {
        userId: pub.id,
        type: 'TASK_REWARD',
        side: 'B',
        balanceDeltaKpoint: 75_000n,
      },
    });
  });

  afterAll(async () => {
    await prisma.walletTransaction.deleteMany({ where: { user: { email: { in: seededEmails } } } });
    await prisma.campaign.deleteMany({ where: { owner: { email: advEmail } } });
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

  it('USER thường và Moderator bị chặn 403, chỉ Admin/Root Admin xem được', async () => {
    const pubToken = await loginAs(pubEmail);
    await request(app.getHttpServer())
      .get('/api/v1/admin/reports/overview')
      .set('Authorization', `Bearer ${pubToken}`)
      .expect(403);

    const modToken = await loginAs(modEmail);
    await request(app.getHttpServer())
      .get('/api/v1/admin/reports/overview')
      .set('Authorization', `Bearer ${modToken}`)
      .expect(403);
  });

  it('Tính đúng doanh thu phí tạo Campaign + phí kích hoạt + escrow + top-10 lists', async () => {
    const advToken = await loginAs(advEmail);
    const adminToken = await loginAs(adminEmail);

    // Kích hoạt Tài khoản Dịch vụ — sinh 1 giao dịch ACCOUNT_ACTIVATION thật
    // (phí mặc định 50.000), trừ thẳng từ balance.
    await request(app.getHttpServer())
      .post('/api/v1/account/activate')
      .set('Authorization', `Bearer ${advToken}`)
      .expect(200);

    // 2 Campaign: (3 slot, 20.000) + (1 slot, 10.000) — tổng ký quỹ dự kiến
    // = 2×50.000 (phí tạo) + 3×20.000 + 1×10.000 = 100.000 + 70.000 = 170.000.
    await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${advToken}`)
      .send({
        title: `E2E Report Campaign A ${suffix}`,
        platform: 'GOOGLE_MAPS',
        totalSlots: 3,
        rewardPerSlot: 20_000,
        dripFeedLimit: 1,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${advToken}`)
      .send({
        title: `E2E Report Campaign B ${suffix}`,
        platform: 'FACEBOOK',
        totalSlots: 1,
        rewardPerSlot: 10_000,
        dripFeedLimit: 1,
      })
      .expect(201);

    const { body } = await request(app.getHttpServer())
      .get('/api/v1/admin/reports/overview?period=all')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.period).toBe('all');
    expect(body.revenue.campaignCount).toBeGreaterThanOrEqual(2);
    expect(body.revenue.activationCount).toBeGreaterThanOrEqual(1);
    // ≥ vì DB test dùng chung giữa các file e2e khác (chạy tuần tự, không
    // song song — xem vitest.config.e2e.ts) nên có thể còn dữ liệu cũ.
    expect(BigInt(body.revenue.campaignCreationFeeKpoint)).toBeGreaterThanOrEqual(100_000n);
    expect(BigInt(body.revenue.activationFeeKpoint)).toBeGreaterThanOrEqual(50_000n);
    expect(BigInt(body.revenue.totalKpoint)).toBe(
      BigInt(body.revenue.campaignCreationFeeKpoint) + BigInt(body.revenue.activationFeeKpoint),
    );

    expect(BigInt(body.escrow.totalReservedKpoint)).toBeGreaterThanOrEqual(170_000n);
    const ourCampaigns = body.escrow.campaigns.filter(
      (c: { ownerEmail: string }) => c.ownerEmail === advEmail,
    );
    expect(ourCampaigns.length).toBe(2);
    const totalLockedForAdv = ourCampaigns.reduce(
      (sum: bigint, c: { lockedKpoint: string }) => sum + BigInt(c.lockedKpoint),
      0n,
    );
    expect(totalLockedForAdv).toBe(170_000n);

    const ourEscrowOwner = body.topEscrowOwners.find(
      (o: { userId: string }) => o.userId === advUserId,
    );
    expect(ourEscrowOwner).toBeDefined();
    expect(BigInt(ourEscrowOwner.totalKpoint)).toBe(170_000n);
    expect(ourEscrowOwner.campaignCount).toBe(2);

    const ourTopup = body.topTopupUsers.find((u: { userId: string }) => u.userId === pubUserId);
    expect(ourTopup).toBeDefined();
    expect(BigInt(ourTopup.totalKpoint)).toBe(200_000n);

    const ourEarner = body.topEarners.find((u: { userId: string }) => u.userId === pubUserId);
    expect(ourEarner).toBeDefined();
    expect(BigInt(ourEarner.totalKpoint)).toBe(75_000n);
  });

  it('period=day chỉ tính dữ liệu hôm nay (fixture vừa tạo vẫn nằm trong đó)', async () => {
    const adminToken = await loginAs(adminEmail);
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/admin/reports/overview?period=day')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.period).toBe('day');
    expect(body.revenue.campaignCount).toBeGreaterThanOrEqual(2);
  });
});
