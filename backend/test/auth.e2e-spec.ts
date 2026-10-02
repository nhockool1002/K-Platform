import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ROOT_ADMIN_ID } from '../src/common/constants.js';

// P1-12/P1-13 — test case bắt buộc theo TASK.md:
//  - Switch Mode A -> B không làm mất phiên (không bị 401 ở request kế tiếp).
//  - Root Administrator (hard-coded ID) không thể bị xóa/hạ cấp qua bất kỳ endpoint nào.
describe('Auth & RBAC (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const advertiserEmail = `e2e-advertiser-${suffix}@kplatform.dev`;
  const adminEmail = `e2e-admin-${suffix}@kplatform.dev`;
  // Sinh ngẫu nhiên mỗi lần chạy — tránh để lộ chuỗi giống mật khẩu thật trong source.
  const password = randomBytes(12).toString('hex');

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

    await prisma.user.upsert({
      where: { id: ROOT_ADMIN_ID },
      update: {},
      create: {
        id: ROOT_ADMIN_ID,
        email: `e2e-root-${suffix}@kplatform.dev`,
        passwordHash,
        role: 'ROOT_ADMIN',
      },
    });

    await prisma.user.create({
      data: { email: advertiserEmail, passwordHash, activeMode: 'A', role: 'USER' },
    });

    await prisma.user.create({
      data: { email: adminEmail, passwordHash, role: 'ADMIN' },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [advertiserEmail, adminEmail] } },
    });
    // Root Admin cố tình KHÔNG xóa ở đây — xác nhận gián tiếp rằng không có
    // đường nào trong test đã xóa được nó.
    await app.close();
  });

  it('P1-12: Switch Mode A -> B rồi gọi API khác không bị 401 (giữ nguyên phiên)', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: advertiserEmail, password })
      .expect(200);

    expect(loginRes.body.user.activeMode).toBe('A');
    const initialAccessToken = loginRes.body.accessToken as string;

    const switchRes = await request(app.getHttpServer())
      .post('/api/v1/auth/switch-mode')
      .set('Authorization', `Bearer ${initialAccessToken}`)
      .send({ targetRole: 'B' })
      .expect(200);

    expect(switchRes.body).toMatchObject({ success: true, activeRole: 'B' });
    const newAccessToken = switchRes.body.accessToken as string;

    // Gọi 1 API bất kỳ khác với access token mới — không được trả 401.
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(200);

    expect(meRes.body.activeMode).toBe('B');
  });

  it('P1-13a: Admin xóa Root Administrator bị chặn 403', async () => {
    const { body: adminLogin } = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/users/${ROOT_ADMIN_ID}`)
      .set('Authorization', `Bearer ${adminLogin.accessToken}`)
      .expect(403);
  });

  it('P1-13b: Admin hạ cấp role của Root Administrator bị chặn 403', async () => {
    const { body: adminLogin } = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${ROOT_ADMIN_ID}/role`)
      .set('Authorization', `Bearer ${adminLogin.accessToken}`)
      .send({ role: 'USER' })
      .expect(403);

    const stillRoot = await prisma.user.findUniqueOrThrow({ where: { id: ROOT_ADMIN_ID } });
    expect(stillRoot.role).toBe('ROOT_ADMIN');
  });

  it('P1-13c: đăng ký trùng email bị chặn 409 và sai mật khẩu bị chặn 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: advertiserEmail, password })
      .expect(409);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: advertiserEmail, password: 'wrong-password' })
      .expect(401);
  });

  it('P1-08: user thường (role USER) không truy cập được API admin', async () => {
    const { body: userLogin } = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: advertiserEmail, password })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${userLogin.accessToken}`)
      .expect(403);

    await request(app.getHttpServer()).get('/api/v1/admin/users').expect(401);
  });
});
