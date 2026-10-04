import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ROOT_ADMIN_ID } from '../src/common/constants.js';

// CMS "Quản Trị Tài Khoản" (yêu cầu mới) — CRUD đầy đủ + kích hoạt/vô hiệu
// hoá tài khoản. Test case:
//  - USER/Moderator bị chặn 403, chỉ Admin/Root Admin truy cập được.
//  - Admin tạo tài khoản mới (USER/MODERATOR OK, ADMIN bị chặn — chỉ Root).
//  - Vô hiệu hoá tài khoản → không đăng nhập được nữa; kích hoạt lại thì được.
//  - "Root thì chỉ có root tự chỉnh" — không ai khác sửa được hồ sơ Root,
//    kể cả Admin khác; và KHÔNG AI (kể cả chính Root) vô hiệu hoá được Root.
describe('Account Management — CMS Quản Trị Tài Khoản (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const rootEmail = `e2e-acct-root-${suffix}@kplatform.dev`;
  const adminEmail = `e2e-acct-admin-${suffix}@kplatform.dev`;
  const otherAdminEmail = `e2e-acct-other-admin-${suffix}@kplatform.dev`;
  const modEmail = `e2e-acct-mod-${suffix}@kplatform.dev`;
  const targetEmail = `e2e-acct-target-${suffix}@kplatform.dev`;
  const password = randomBytes(12).toString('hex');
  const seededEmails = [adminEmail, otherAdminEmail, modEmail, targetEmail];

  let targetId: string;
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
    await prisma.user.create({
      data: { email: otherAdminEmail, passwordHash, activeMode: 'A', role: 'ADMIN' },
    });
    await prisma.user.create({
      data: { email: modEmail, passwordHash, activeMode: 'A', role: 'MODERATOR' },
    });
    const target = await prisma.user.create({
      data: { email: targetEmail, passwordHash, activeMode: 'A', role: 'USER' },
    });
    targetId = target.id;

    const existingRoot = await prisma.user.findUnique({ where: { id: ROOT_ADMIN_ID } });
    if (existingRoot) {
      rootExisted = true;
      await prisma.user.update({ where: { id: ROOT_ADMIN_ID }, data: { passwordHash } });
    } else {
      await prisma.user.create({
        data: { id: ROOT_ADMIN_ID, email: rootEmail, passwordHash, role: 'ROOT_ADMIN' },
      });
    }
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actor: { email: { in: seededEmails } } }, { actorId: ROOT_ADMIN_ID }] },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [...seededEmails, `e2e-acct-new-${suffix}@kplatform.dev`] } },
    });
    if (!rootExisted) {
      await prisma.user.deleteMany({ where: { id: ROOT_ADMIN_ID } });
    }
    await app.close();
  });

  function loginAs(email: string, pass = password) {
    return request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password: pass });
  }

  async function tokenFor(email: string): Promise<string> {
    const { body } = await loginAs(email).expect(200);
    return body.accessToken as string;
  }

  it('USER/Moderator bị chặn 403, chỉ Admin/Root Admin truy cập được', async () => {
    const modToken = await tokenFor(modEmail);
    await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${modToken}`)
      .expect(403);
  });

  it('Admin tạo tài khoản USER/MODERATOR được, tạo ADMIN bị chặn (chỉ Root)', async () => {
    const adminToken = await tokenFor(adminEmail);
    const newEmail = `e2e-acct-new-${suffix}@kplatform.dev`;

    const { body: created } = await request(app.getHttpServer())
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: newEmail, password: randomBytes(10).toString('hex'), role: 'MODERATOR' })
      .expect(201);
    expect(created.role).toBe('MODERATOR');

    await request(app.getHttpServer())
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `e2e-acct-admin-attempt-${suffix}@kplatform.dev`,
        password: randomBytes(10).toString('hex'),
        role: 'ADMIN',
      })
      .expect(403);

    // Trùng email bị chặn 409.
    await request(app.getHttpServer())
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: newEmail, password: randomBytes(10).toString('hex') })
      .expect(409);
  });

  it('Root tạo được tài khoản ADMIN', async () => {
    // rootEmail có thể không phải email thật (đã tồn tại từ trước) — login
    // bằng email đã biết chắc chắn đúng của Root trong lần chạy này.
    const actualRootEmail = rootExisted
      ? (await prisma.user.findUniqueOrThrow({ where: { id: ROOT_ADMIN_ID } })).email
      : rootEmail;
    const token = await tokenFor(actualRootEmail);

    const { body: created } = await request(app.getHttpServer())
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: `e2e-acct-admin-by-root-${suffix}@kplatform.dev`,
        password: randomBytes(10).toString('hex'),
        role: 'ADMIN',
      })
      .expect(201);
    expect(created.role).toBe('ADMIN');

    await prisma.user.delete({ where: { id: created.id } });
  });

  it('Vô hiệu hoá tài khoản → không đăng nhập được; kích hoạt lại thì được', async () => {
    const adminToken = await tokenFor(adminEmail);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${targetId}/active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false })
      .expect(200);

    await loginAs(targetEmail).expect(401);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${targetId}/active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: true })
      .expect(200);

    await loginAs(targetEmail).expect(200);
  });

  it('Admin khác KHÔNG sửa được hồ sơ Root; Root tự sửa chính mình thì được', async () => {
    const otherAdminToken = await tokenFor(otherAdminEmail);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${ROOT_ADMIN_ID}/profile`)
      .set('Authorization', `Bearer ${otherAdminToken}`)
      .send({ password: randomBytes(10).toString('hex') })
      .expect(403);

    const actualRootEmail = (await prisma.user.findUniqueOrThrow({ where: { id: ROOT_ADMIN_ID } }))
      .email;
    const rootToken = await tokenFor(actualRootEmail);
    const newRootPassword = randomBytes(10).toString('hex');
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${ROOT_ADMIN_ID}/profile`)
      .set('Authorization', `Bearer ${rootToken}`)
      .send({ password: newRootPassword })
      .expect(200);

    // Xác nhận mật khẩu mới có hiệu lực, rồi trả lại mật khẩu seed ban đầu.
    await loginAs(actualRootEmail, newRootPassword).expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${ROOT_ADMIN_ID}/profile`)
      .set('Authorization', `Bearer ${rootToken}`)
      .send({ password })
      .expect(200);
  });

  it('KHÔNG AI (kể cả chính Root) vô hiệu hoá được Root qua API', async () => {
    const actualRootEmail = (await prisma.user.findUniqueOrThrow({ where: { id: ROOT_ADMIN_ID } }))
      .email;
    const rootToken = await tokenFor(actualRootEmail);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${ROOT_ADMIN_ID}/active`)
      .set('Authorization', `Bearer ${rootToken}`)
      .send({ active: false })
      .expect(403);

    const adminToken = await tokenFor(adminEmail);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${ROOT_ADMIN_ID}/active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false })
      .expect(403);
  });
});
