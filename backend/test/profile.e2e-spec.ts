import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Đăng ký (xác nhận mật khẩu + thông tin cá nhân) và hồ sơ (sửa thông tin, avatar,
// email KHÔNG đổi được).
describe('Đăng ký & Hồ sơ người dùng (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const email = `e2e-profile-${suffix}@kplatform.dev`;
  const password = randomBytes(10).toString('hex');
  let token: string;
  let tinyPng: Buffer;

  const validRegister = () => ({
    email,
    password,
    confirmPassword: password,
    fullName: 'Trần Thị Khảo Sát',
    phone: '0987654321',
    dateOfBirth: '1992-03-15',
    gender: 'FEMALE',
    province: 'Đà Nẵng',
    occupation: 'Nhân viên văn phòng',
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    tinyPng = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#1d4e89' } })
      .png()
      .toBuffer();
  });

  afterAll(async () => {
    await prisma.wallet.deleteMany({ where: { user: { email } } });
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('Đăng ký thiếu xác nhận mật khẩu hoặc sai ngày sinh/SĐT bị chặn 400', async () => {
    const { confirmPassword: _c, ...noConfirm } = validRegister();
    void _c;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(noConfirm).expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...validRegister(), confirmPassword: 'khac-mat-khau' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...validRegister(), phone: '12345' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...validRegister(), dateOfBirth: '2020-01-01' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...validRegister(), province: 'Thành phố tưởng tượng' })
      .expect(400);
  });

  it('Đăng ký hợp lệ lưu đủ thông tin cá nhân', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(validRegister())
      .expect(201);
    token = body.accessToken as string;
    const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(stored.fullName).toBe('Trần Thị Khảo Sát');
    expect(stored.gender).toBe('FEMALE');
    expect(stored.province).toBe('Đà Nẵng');
  });

  it('Hồ sơ: xem đầy đủ thông tin; sửa được bio/SĐT/tỉnh; đổi email bị từ chối 400', async () => {
    const { body: me } = await request(app.getHttpServer())
      .get('/api/v1/profile/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(me.email).toBe(email);
    expect(me.province).toBe('Đà Nẵng');

    const { body: updated } = await request(app.getHttpServer())
      .patch('/api/v1/profile/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'Thích đánh giá quán cà phê', phone: '0900000001', province: 'Hà Nội' })
      .expect(200);
    expect(updated.bio).toBe('Thích đánh giá quán cà phê');
    expect(updated.province).toBe('Hà Nội');

    await request(app.getHttpServer())
      .patch('/api/v1/profile/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'doi-email@kplatform.dev' })
      .expect(400);

    const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(stored.email).toBe(email);
  });

  it('Avatar: PNG được nhận; file không phải ảnh bị từ chối 400', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/v1/profile/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', tinyPng, { filename: 'me.png', contentType: 'image/png' })
      .expect(201);
    expect(body.avatarUrl).toMatch(/^\/uploads\/avatars\/[a-f0-9]+\.png$/);

    await request(app.getHttpServer())
      .post('/api/v1/profile/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('not an image'), { filename: 'x.txt', contentType: 'text/plain' })
      .expect(400);
  });

  it('Hồ sơ yêu cầu đăng nhập (401 khi không có token)', async () => {
    await request(app.getHttpServer()).get('/api/v1/profile/me').expect(401);
  });
});
