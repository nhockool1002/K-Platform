import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditActionType, AuditLevel, UserRole } from '../prisma/client.js';
import { ROOT_ADMIN_ID } from '../common/constants.js';
import type { CreateAccountDto } from './dto/create-account.dto.js';
import type { UpdateAccountProfileDto } from './dto/update-account-profile.dto.js';

const LIST_SELECT = {
  id: true,
  email: true,
  role: true,
  activeMode: true,
  trustScore: true,
  disabledAt: true,
  serviceActivatedAt: true,
  createdAt: true,
} as const;

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // CMS Quản Trị Tài Khoản — danh sách đầy đủ mọi tài khoản (khác CMS RBAC
  // chỉ liệt kê staff). `isRootAdmin` để FE khoá toàn bộ hàng của Root.
  async list() {
    const users = await this.prisma.user.findMany({
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => ({ ...u, isRootAdmin: u.id === ROOT_ADMIN_ID }));
  }

  async getOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: LIST_SELECT });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return { ...user, isRootAdmin: user.id === ROOT_ADMIN_ID };
  }

  // Admin tạo tài khoản mới trực tiếp từ CMS (khác luồng tự đăng ký).
  async create(actorId: string, actorRole: UserRole, dto: CreateAccountDto, ip: string | null) {
    const role = dto.role ?? UserRole.USER;
    if (role === UserRole.ROOT_ADMIN) {
      throw new ForbiddenException('Không thể tạo tài khoản với role ROOT_ADMIN qua API');
    }
    if (role === UserRole.ADMIN && actorRole !== UserRole.ROOT_ADMIN) {
      throw new ForbiddenException('Chỉ Root Administrator được phép tạo tài khoản Admin');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: dto.email,
            passwordHash,
            role,
            activeMode: dto.activeMode ?? 'A',
          },
          select: LIST_SELECT,
        });
        await tx.wallet.create({
          data: { userId: created.id, balanceKpoint: 0n, reservedKpoint: 0n },
        });
        return created;
      });

      await this.prisma.auditLog.create({
        data: {
          actorId,
          targetResource: `user:${user.id}`,
          actionType: AuditActionType.CREATE,
          level: role === UserRole.ADMIN ? AuditLevel.CRITICAL : AuditLevel.INFO,
          payloadAfter: { email: user.email, role: user.role },
          ip: ip ?? undefined,
        },
      });

      return { ...user, isRootAdmin: false };
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException('Email đã được đăng ký');
      }
      throw err;
    }
  }

  // Sửa email/mật khẩu — route gắn RootAdminSelfOnlyGuard (chỉ Root tự sửa
  // được chính mình, người khác không đụng vào Root được dù là Admin khác).
  async updateProfile(
    actorId: string,
    targetId: string,
    dto: UpdateAccountProfileDto,
    ip: string | null,
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { email: true },
    });
    if (!target) throw new NotFoundException('Không tìm thấy tài khoản');
    if (!dto.email && !dto.password) {
      throw new ConflictException('Cần ít nhất 1 trường để cập nhật (email hoặc password)');
    }

    const data: { email?: string; passwordHash?: string } = {};
    if (dto.email) data.email = dto.email;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      const updated = await this.prisma.user.update({
        where: { id: targetId },
        data,
        select: LIST_SELECT,
      });

      await this.prisma.auditLog.create({
        data: {
          actorId,
          targetResource: `user:${targetId}`,
          actionType: AuditActionType.UPDATE,
          level: targetId === ROOT_ADMIN_ID ? AuditLevel.CRITICAL : AuditLevel.INFO,
          payloadBefore: { email: target.email },
          payloadAfter: {
            email: data.email ?? target.email,
            passwordChanged: Boolean(dto.password),
          },
          ip: ip ?? undefined,
        },
      });

      return { ...updated, isRootAdmin: updated.id === ROOT_ADMIN_ID };
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException('Email đã được dùng bởi tài khoản khác');
      }
      throw err;
    }
  }

  // Kích hoạt/Vô hiệu hoá tài khoản — route gắn RootAdminTargetGuard (chặn
  // tuyệt đối, kể cả Root tự khoá chính mình, để tránh tự khoá không ai mở
  // lại được).
  async setActive(actorId: string, targetId: string, active: boolean, ip: string | null) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { disabledAt: true },
    });
    if (!target) throw new NotFoundException('Không tìm thấy tài khoản');

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { disabledAt: active ? null : new Date() },
      select: LIST_SELECT,
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        targetResource: `user:${targetId}`,
        actionType: AuditActionType.UPDATE,
        level: AuditLevel.WARNING,
        payloadBefore: { disabledAt: target.disabledAt },
        payloadAfter: { disabledAt: updated.disabledAt },
        ip: ip ?? undefined,
      },
    });

    return { ...updated, isRootAdmin: updated.id === ROOT_ADMIN_ID };
  }

  // P7-07 — gán quyền Admin/Moderator. P7-10 hardening: chỉ Root Admin được
  // phép NÂNG lên ADMIN hoặc HẠ CẤP một Admin hiện tại — khớp đúng README §
  // II "Root Administrator: ... nâng/hạ cấp các Admin khác". Admin thường chỉ
  // được đổi qua lại USER ↔ MODERATOR (vận hành nhân sự hằng ngày), không
  // được tự phong/hạ cấp Admin ngang hàng (tránh leo thang đặc quyền).
  async updateRole(
    actorId: string,
    actorRole: UserRole,
    targetId: string,
    newRole: UserRole,
    ip: string | null,
  ) {
    if (newRole === UserRole.ROOT_ADMIN) {
      throw new ForbiddenException('Không thể gán role ROOT_ADMIN qua API');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { role: true, email: true },
    });
    if (!target) throw new NotFoundException('Không tìm thấy tài khoản');

    const touchesAdminLevel = newRole === UserRole.ADMIN || target.role === UserRole.ADMIN;
    if (touchesAdminLevel && actorRole !== UserRole.ROOT_ADMIN) {
      throw new ForbiddenException(
        'Chỉ Root Administrator được phép nâng cấp lên Admin hoặc hạ cấp một Admin hiện tại',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { role: newRole },
      select: { id: true, email: true, role: true },
    });

    // P7-11 — ghi Audit Log cho thay đổi role (interceptor tổng quát bắt MỌI
    // Mutation thuộc Phase 6/FN-LOG-01; ở đây ghi trực tiếp cho riêng hành
    // động nhạy cảm này để P7-11 có dữ liệu thật để test ngay).
    await this.prisma.auditLog.create({
      data: {
        actorId,
        targetResource: `user:${targetId}`,
        actionType: AuditActionType.UPDATE,
        level: touchesAdminLevel ? AuditLevel.CRITICAL : AuditLevel.INFO,
        payloadBefore: { role: target.role },
        payloadAfter: { role: newRole },
        ip: ip ?? undefined,
      },
    });

    return updated;
  }

  async remove(actorId: string, targetId: string, ip: string | null) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { role: true, email: true },
    });
    if (!target) throw new NotFoundException('Không tìm thấy tài khoản');

    await this.prisma.user.delete({ where: { id: targetId } });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        targetResource: `user:${targetId}`,
        actionType: AuditActionType.DELETE,
        level: AuditLevel.CRITICAL,
        payloadBefore: { email: target.email, role: target.role },
        ip: ip ?? undefined,
      },
    });

    return { success: true };
  }
}
