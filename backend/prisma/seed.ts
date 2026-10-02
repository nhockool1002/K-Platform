// Seed data mẫu cho dev/staging — 1 user đại diện mỗi role trong SRS Section II.
// Task: P0-06, cập nhật ở P1-01/P1-09 (role field + Root Admin hard-coded ID).
// Chạy: pnpm --filter backend prisma:seed
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ROOT_ADMIN_ID } from '../src/common/constants.ts';

const prisma = new PrismaClient();

const DEV_PASSWORD = 'Passw0rd!'; // Chỉ dùng cho seed dev/staging, không dùng ở production.

async function upsertUser(params: {
  id?: string;
  email: string;
  role?: UserRole;
  activeMode?: 'A' | 'B';
  trustScore?: number;
}) {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: { role: params.role ?? UserRole.USER },
    create: {
      id: params.id,
      email: params.email,
      passwordHash,
      role: params.role ?? UserRole.USER,
      activeMode: params.activeMode ?? 'A',
      trustScore: params.trustScore ?? 100,
    },
  });

  await prisma.wallet.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, balanceKpoint: 1_000_000n, reservedKpoint: 0n },
  });

  return user;
}

async function main() {
  console.log('Seeding dev data...');

  const root = await upsertUser({
    id: ROOT_ADMIN_ID,
    email: 'root@kplatform.dev',
    role: UserRole.ROOT_ADMIN,
  });
  const admin = await upsertUser({ email: 'admin@kplatform.dev', role: UserRole.ADMIN });
  const moderator = await upsertUser({
    email: 'moderator@kplatform.dev',
    role: UserRole.MODERATOR,
  });
  const advertiser = await upsertUser({ email: 'advertiser@kplatform.dev', activeMode: 'A' });
  const publisher = await upsertUser({ email: 'publisher@kplatform.dev', activeMode: 'B' });

  await prisma.rolePermission.createMany({
    data: [
      { roleName: 'ROOT_ADMIN', permissionCode: '*' },
      { roleName: 'ADMIN', permissionCode: 'payments.approve' },
      { roleName: 'ADMIN', permissionCode: 'disputes.resolve' },
      { roleName: 'MODERATOR', permissionCode: 'disputes.recommend' },
      { roleName: 'ADVERTISER', permissionCode: 'campaigns.create' },
      { roleName: 'PUBLISHER', permissionCode: 'submissions.create' },
    ],
    skipDuplicates: true,
  });

  console.log('Seeded users (password dùng chung cho dev):', DEV_PASSWORD);
  console.table(
    [root, admin, moderator, advertiser, publisher].map((u) => ({
      email: u.email,
      role: u.role,
      activeMode: u.activeMode,
    })),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
