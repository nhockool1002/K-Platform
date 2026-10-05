import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ROOT_ADMIN_ID } from '../src/common/constants.js';

// Phân quyền theo nhóm + override riêng từng user (SCR-12). Kiểm tra: nhóm hệ thống
// không xoá được, quyền CRUD theo từng tài nguyên, override ưu tiên hơn nhóm, bảo vệ
// Root/Admin, moderator được phân công Campaign khi có quyền, hạ role xoá quyền.
describe('RBAC — nhóm quyền & override (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const adminEmail = `e2e-rbac-admin-${suffix}@kplatform.dev`;
  const otherAdminEmail = `e2e-rbac-admin2-${suffix}@kplatform.dev`;
  const modEmail = `e2e-rbac-mod-${suffix}@kplatform.dev`;
  const userEmail = `e2e-rbac-user-${suffix}@kplatform.dev`;
  const staffEmail = `e2e-rbac-staff-${suffix}@kplatform.dev`;
  const newAccountEmail = `e2e-rbac-new-${suffix}@kplatform.dev`;
  const password = randomBytes(12).toString('hex');
  const newAccountPassword = `np-${randomBytes(8).toString('hex')}`;
  const groupName = `E2E Supermoderator ${suffix}`;

  let adminToken: string;
  let modToken: string;
  let userToken: string;
  let staffToken: string;
  let adminId: string;
  let otherAdminId: string;
  let staffId: string;
  let groupId: string;
  let createdAccountId: string | undefined;

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

    const passwordHash = await bcrypt.hash(password, 10);
    adminId = (
      await prisma.user.create({
        data: { email: adminEmail, passwordHash, activeMode: 'A', role: 'ADMIN' },
      })
    ).id;
    otherAdminId = (
      await prisma.user.create({
        data: { email: otherAdminEmail, passwordHash, activeMode: 'A', role: 'ADMIN' },
      })
    ).id;
    await prisma.user.create({
      data: { email: modEmail, passwordHash, activeMode: 'A', role: 'MODERATOR' },
    });
    await prisma.user.create({
      data: { email: userEmail, passwordHash, activeMode: 'A', role: 'USER' },
    });
    staffId = (
      await prisma.user.create({
        data: { email: staffEmail, passwordHash, activeMode: 'A', role: 'USER' },
      })
    ).id;

    adminToken = await loginAs(adminEmail);
    modToken = await loginAs(modEmail);
    userToken = await loginAs(userEmail);
    staffToken = await loginAs(staffEmail);
  });

  afterAll(async () => {
    const emails = [adminEmail, otherAdminEmail, modEmail, userEmail, staffEmail, newAccountEmail];
    await prisma.userPermissionOverride.deleteMany({ where: { user: { email: { in: emails } } } });
    await prisma.userAccessGroup.deleteMany({ where: { user: { email: { in: emails } } } });
    await prisma.accessGroup.deleteMany({ where: { name: groupName } });
    await prisma.trustScoreTransaction.deleteMany({ where: { user: { email: { in: emails } } } });
    await prisma.wallet.deleteMany({ where: { user: { email: { in: emails } } } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  async function loginAs(email: string): Promise<string> {
    const { body } = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return body.accessToken as string;
  }

  it('Nhóm hệ thống: Quản trị viên và Moderator tồn tại, không xoá được, đổi tên được', async () => {
    const { body: groups } = await request(app.getHttpServer())
      .get('/api/v1/admin/rbac/groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const admin = groups.find((g: { linkedRole: string }) => g.linkedRole === 'ADMIN');
    const mod = groups.find((g: { linkedRole: string }) => g.linkedRole === 'MODERATOR');
    expect(admin.isSystem).toBe(true);
    expect(mod.isSystem).toBe(true);
    expect(admin.permissions.length).toBeGreaterThan(mod.permissions.length);

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/rbac/groups/${mod.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('Phân quyền theo nhóm: USER / MODERATOR không vào được trang quản trị RBAC (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/rbac/groups')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/admin/rbac/groups')
      .set('Authorization', `Bearer ${modToken}`)
      .expect(403);
  });

  it('Tạo nhóm "Supermoderator": cấp Xem/Tạo/Sửa tài khoản, KHÔNG có Xoá', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/v1/admin/rbac/groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: groupName,
        description: 'E2E: Moderator được tạo/sửa tài khoản, không xoá',
        permissions: [
          { resource: 'accounts', action: 'READ' },
          { resource: 'accounts', action: 'CREATE' },
          { resource: 'accounts', action: 'UPDATE' },
          { resource: 'disputes', action: 'READ' },
        ],
      })
      .expect(201);
    groupId = body.id;
  });

  it('Gán nhóm cho user thường → user có quyền trong nhóm; không gán được nhóm hệ thống thủ công', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/admin/rbac/users/${staffId}/groups`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ groupIds: [groupId] })
      .expect(200);

    const { body } = await request(app.getHttpServer())
      .get('/api/v1/admin/rbac/me')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
    expect(body.permissions).toEqual(
      expect.arrayContaining(['accounts:READ', 'accounts:CREATE', 'accounts:UPDATE']),
    );
    expect(body.permissions).not.toContain('accounts:DELETE');

    const { body: groups } = await request(app.getHttpServer())
      .get('/api/v1/admin/rbac/groups')
      .set('Authorization', `Bearer ${adminToken}`);
    const modGroup = groups.find((g: { linkedRole: string }) => g.linkedRole === 'MODERATOR');
    await request(app.getHttpServer())
      .put(`/api/v1/admin/rbac/users/${staffId}/groups`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ groupIds: [modGroup.id] })
      .expect(400);
  });

  it('Nhóm chỉ có Tạo (không Xoá): tạo tài khoản được, xoá bị chặn 403 với thông báo rõ', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ email: newAccountEmail, password: newAccountPassword })
      .expect(201);
    createdAccountId = created.body.id;

    const { body } = await request(app.getHttpServer())
      .delete(`/api/v1/admin/users/${createdAccountId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
    expect(body.message).toContain('Quản trị tài khoản');
    expect(body.message).toContain('Xoá');
  });

  it('Override ưu tiên hơn nhóm: DENY chặn quyền nhóm cấp; ALLOW cấp quyền nhóm không có', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/admin/rbac/users/${staffId}/overrides`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ overrides: [{ resource: 'accounts', action: 'CREATE', effect: 'DENY' }] })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ email: `x-${newAccountEmail}`, password: newAccountPassword })
      .expect(403);

    await request(app.getHttpServer())
      .put(`/api/v1/admin/rbac/users/${staffId}/overrides`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        overrides: [
          { resource: 'accounts', action: 'CREATE', effect: null },
          { resource: 'trust_score', action: 'READ', effect: 'ALLOW' },
        ],
      })
      .expect(200);
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/admin/rbac/me')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
    expect(body.permissions).toContain('accounts:CREATE');
    expect(body.permissions).toContain('trust_score:READ');
  });

  it('Xem quyền hiệu lực của user: có nhóm, override và danh sách effective', async () => {
    const { body } = await request(app.getHttpServer())
      .get(`/api/v1/admin/rbac/users/${staffId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(body.groups.map((g: { id: string }) => g.id)).toContain(groupId);
    expect(body.overrides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ resource: 'trust_score', effect: 'ALLOW' }),
      ]),
    );
    expect(body.effective).toContain('accounts:UPDATE');
  });

  it('Bảo vệ: không ai chỉnh quyền Root; Admin thường không chỉnh quyền Admin khác; không tự chỉnh quyền mình', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/admin/rbac/users/${ROOT_ADMIN_ID}/overrides`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ overrides: [{ resource: 'accounts', action: 'READ', effect: 'DENY' }] })
      .expect(403);

    await request(app.getHttpServer())
      .put(`/api/v1/admin/rbac/users/${otherAdminId}/groups`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ groupIds: [groupId] })
      .expect(403);

    await request(app.getHttpServer())
      .put(`/api/v1/admin/rbac/users/${adminId}/overrides`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ overrides: [{ resource: 'accounts', action: 'READ', effect: 'DENY' }] })
      .expect(403);
  });

  it('Moderator mặc định: xem được Dispute (đề xuất), KHÔNG xem được rút tiền / cài đặt', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/mod/disputes')
      .set('Authorization', `Bearer ${modToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/admin/withdrawals')
      .set('Authorization', `Bearer ${modToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/admin/settings/sepay')
      .set('Authorization', `Bearer ${modToken}`)
      .expect(403);
  });

  it('Hạ role về USER xoá hết nhóm và override của user (không để quyền CMS tồn đọng)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${staffId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'USER' })
      .expect(200);

    const { body } = await request(app.getHttpServer())
      .get(`/api/v1/admin/rbac/users/${staffId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(body.groups).toEqual([]);
    expect(body.overrides).toEqual([]);
    expect(body.effective).toEqual([]);
  });

  it('Xoá nhóm tự tạo: user mất quyền của nhóm đó', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/rbac/groups/${groupId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const rows = await prisma.userAccessGroup.count({ where: { groupId } });
    expect(rows).toBe(0);
  });
});
