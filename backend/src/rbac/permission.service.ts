import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { OverrideEffect, PermissionAction, UserRole } from '../prisma/client.js';
import { ROOT_ADMIN_ID } from '../common/constants.js';
import {
  ACTION_LABEL,
  PERMISSION_RESOURCES,
  permissionKey,
  type ResourceKey,
} from './permission-catalog.js';

export interface EffectivePermissions {
  isRoot: boolean;
  keys: Set<string>;
}

// Quyền hiệu lực = Root (toàn quyền) > override riêng user (ALLOW/DENY) > union
// quyền các nhóm (nhóm gắn role + nhóm user được thêm). Override thắng nhóm.
@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async effectiveFor(userId: string): Promise<EffectivePermissions> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, disabledAt: true },
    });
    if (!user) throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    if (user.disabledAt) throw new UnauthorizedException('Tài khoản đã bị vô hiệu hoá');
    if (user.id === ROOT_ADMIN_ID || user.role === UserRole.ROOT_ADMIN) {
      return { isRoot: true, keys: new Set() };
    }

    const [groupPerms, overrides] = await Promise.all([
      this.prisma.accessGroupPermission.findMany({
        where: {
          group: {
            OR: [{ linkedRole: user.role }, { members: { some: { userId } } }],
          },
        },
        select: { resource: true, action: true },
      }),
      this.prisma.userPermissionOverride.findMany({
        where: { userId },
        select: { resource: true, action: true, effect: true },
      }),
    ]);

    const keys = new Set(groupPerms.map((p) => permissionKey(p.resource, p.action)));
    for (const o of overrides) {
      const key = permissionKey(o.resource, o.action);
      if (o.effect === OverrideEffect.ALLOW) keys.add(key);
      else keys.delete(key);
    }
    return { isRoot: false, keys };
  }

  async can(userId: string, resource: ResourceKey, action: PermissionAction): Promise<boolean> {
    const eff = await this.effectiveFor(userId);
    return eff.isRoot || eff.keys.has(permissionKey(resource, action));
  }

  // Dùng trong service khi cần kiểm tra quyền của NGƯỜI KHÁC (vd. moderator được
  // phân công phải có quyền quản trị Campaign).
  async assertCan(
    userId: string,
    resource: ResourceKey,
    action: PermissionAction,
    message?: string,
  ) {
    if (!(await this.can(userId, resource, action))) {
      throw new ForbiddenException(message ?? permissionDeniedMessage(resource, action));
    }
  }
}

export function permissionDeniedMessage(resource: ResourceKey, action: PermissionAction): string {
  return `Bạn không có quyền "${PERMISSION_RESOURCES[resource].label}" (${ACTION_LABEL[action]}). Liên hệ quản trị viên để được cấp quyền.`;
}
