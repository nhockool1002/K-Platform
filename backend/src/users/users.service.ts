import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditActionType, AuditLevel, UserRole } from '../prisma/client.js';
import { ROOT_ADMIN_ID } from '../common/constants.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const users = await this.prisma.user.findMany({
      select: { id: true, email: true, role: true, activeMode: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u) => ({ ...u, isRootAdmin: u.id === ROOT_ADMIN_ID }));
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
