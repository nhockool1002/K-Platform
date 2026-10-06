import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Service Account Activation — chuyển sang Tài khoản Dịch vụ (activeMode=A)
// luôn miễn phí, nhưng phải trả phí kích hoạt 1 lần (CMS "Cài đặt phí kích
// hoạt", mặc định 50.000 KPoint) mới được tạo Campaign. Test case:
//  - Chưa kích hoạt: GET activation-status.activated=false, POST /campaigns bị 403.
//  - Không đủ số dư: POST /account/activate bị 400.
//  - Kích hoạt thành công: trừ đúng phí, ghi ledger ACCOUNT_ACTIVATION, sau đó
//    tạo Campaign thành công.
//  - Kích hoạt 2 lần bị chặn 400.
describe('Account Activation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const poorEmail = `e2e-activation-poor-${suffix}@kplatform.dev`;
  const richEmail = `e2e-activation-rich-${suffix}@kplatform.dev`;
  const password = randomBytes(12).toString('hex');

  const seededEmails = [poorEmail, richEmail];

  const campaignPayload = {
    title: 'E2E Activation Campaign',
    platform: 'GOOGLE_MAPS',
    totalSlots: 1,
    rewardPerSlot: 10_000,
    dripFeedLimit: 1,
  };

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

    const poor = await prisma.user.create({
      data: { email: poorEmail, passwordHash, activeMode: 'A', role: 'USER' },
    });
    await prisma.wallet.create({
      data: { userId: poor.id, balanceKpoint: 1_000n, reservedKpoint: 0n },
    });

    const rich = await prisma.user.create({
      data: { email: richEmail, passwordHash, activeMode: 'A', role: 'USER' },
    });
    await prisma.wallet.create({
      data: { userId: rich.id, balanceKpoint: 1_000_000n, reservedKpoint: 0n },
    });
  });

  afterAll(async () => {
    await prisma.systemSetting.deleteMany({ where: { key: 'activation_fee' } });
    await prisma.walletTransaction.deleteMany({
      where: { user: { email: { in: seededEmails } } },
    });
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

  it('Chưa kích hoạt — activation-status.activated=false, phí mặc định 50.000', async () => {
    const token = await loginAs(poorEmail);
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/account/activation-status')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(body.activated).toBe(false);
    expect(body.feeKpoint).toBe('50000');
  });

  it('Chưa kích hoạt — tạo Campaign bị chặn 403', async () => {
    const token = await loginAs(richEmail);
    await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send(campaignPayload)
      .expect(403);
  });

  it('Không đủ số dư — kích hoạt bị chặn 400, không trừ ví', async () => {
    const token = await loginAs(poorEmail);
    await request(app.getHttpServer())
      .post('/api/v1/account/activate')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    const { body: wallet } = await request(app.getHttpServer())
      .get('/api/v1/payments/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(wallet.balanceKpoint).toBe('1000');
  });

  it('Đủ số dư — kích hoạt thành công, trừ đúng phí + ghi ledger, mở khoá tạo Campaign', async () => {
    const token = await loginAs(richEmail);

    const { body: activated } = await request(app.getHttpServer())
      .post('/api/v1/account/activate')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(activated.activated).toBe(true);
    expect(activated.feeKpoint).toBe('50000');

    const { body: wallet } = await request(app.getHttpServer())
      .get('/api/v1/payments/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(wallet.balanceKpoint).toBe('950000');

    const { body: txs } = await request(app.getHttpServer())
      .get('/api/v1/payments/transactions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const activationTx = txs.find((t: { type: string }) => t.type === 'ACCOUNT_ACTIVATION');
    expect(activationTx).toBeDefined();
    expect(activationTx.balanceDeltaKpoint).toBe('-50000');

    await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send(campaignPayload)
      .expect(201);
  });

  it('Kích hoạt lần 2 bị chặn 400', async () => {
    const token = await loginAs(richEmail);
    await request(app.getHttpServer())
      .post('/api/v1/account/activate')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });
});
