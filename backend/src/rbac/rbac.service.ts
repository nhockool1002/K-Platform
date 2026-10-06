import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PermissionAction, UserRole } from '../prisma/client.js';
import { ROOT_ADMIN_ID } from '../common/constants.js';
import { PermissionService } from './permission.service.js';
import {
  MODERATOR_DEFAULT_PERMISSIONS,
  PERMISSION_RESOURCES,
  allCatalogPermissions,
  isValidPermission,
  permissionKey,
  type ResourceKey,
} from './permission-catalog.js';
import type {
  CreateGroupDto,
  ListRbacUsersQuery,
  OverrideEntryDto,
  PermissionEntryDto,
  UpdateGroupDto,
} from './dto/rbac.dto.js';

const SYSTEM_GROUPS: { linkedRole: UserRole; name: string; description: string }[] = [
  {
    linkedRole: UserRole.ADMIN,
    name: 'Quản trị viên',
    description: 'Nhóm hệ thống gắn role Quản trị viên. Mặc định có toàn bộ quyền.',
  },
  {
    linkedRole: UserRole.MODERATOR,
    name: 'Moderator',
    description: 'Nhóm hệ thống gắn role Moderator. Mặc định xem Dispute & Campaign.',
  },
];

@Injectable()
export class RbacService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
  ) {}

  // Tạo 2 nhóm hệ thống nếu chưa có. Idempotent: không ghi đè quyền Admin đã chỉnh.
  async onModuleInit() {
    for (const sg of SYSTEM_GROUPS) {
      const exists = await this.prisma.accessGroup.findFirst({
        where: { OR: [{ linkedRole: sg.linkedRole }, { name: sg.name }] },
        select: { id: true },
      });
      if (exists) {
        if (sg.linkedRole === UserRole.ADMIN) await this.grantNewAdminPermissions(exists.id);
        continue;
      }
      const perms =
        sg.linkedRole === UserRole.ADMIN ? allCatalogPermissions() : MODERATOR_DEFAULT_PERMISSIONS;
      await this.prisma.accessGroup.create({
        data: {
          name: sg.name,
          description: sg.description,
          linkedRole: sg.linkedRole,
          isSystem: true,
          permissions: {
            create: perms.map(([resource, action]) => ({ resource, action })),
          },
        },
      });
    }
  }

  // Nhóm Quản trị viên mặc định có toàn bộ quyền, nhưng nhóm chỉ được tạo 1 lần
  // lúc khởi động đầu tiên. Khi catalog thêm resource/action mới, bổ sung chúng
  // vào nhóm này (chỉ thêm, không xoá và không đụng quyền Admin đã chỉnh tay khác).
  private async grantNewAdminPermissions(groupId: string) {
    const existing = await this.prisma.accessGroupPermission.findMany({
      where: { groupId },
      select: { resource: true, action: true },
    });
    const have = new Set(existing.map((p) => `${p.resource}:${p.action}`));
    const missing = allCatalogPermissions().filter(([r, a]) => !have.has(`${r}:${a}`));
    if (missing.length === 0) return;
    await this.prisma.accessGroupPermission.createMany({
      data: missing.map(([resource, action]) => ({ groupId, resource, action })),
      skipDuplicates: true,
    });
  }

  catalog() {
    return Object.entries(PERMISSION_RESOURCES).map(([key, def]) => ({
      resource: key,
      label: def.label,
      area: def.area,
      actions: def.actions,
    }));
  }

  async listGroups() {
    const groups = await this.prisma.accessGroup.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: {
        permissions: { select: { resource: true, action: true } },
        _count: { select: { members: true } },
      },
    });
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      linkedRole: g.linkedRole,
      isSystem: g.isSystem,
      memberCount: g._count.members,
      permissions: g.permissions.map((p) => ({ resource: p.resource, action: p.action })),
    }));
  }

  async createGroup(dto: CreateGroupDto) {
    const perms = this.validatePermissions(dto.permissions ?? []);
    await this.assertNameFree(dto.name);
    const group = await this.prisma.accessGroup.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        isSystem: false,
        permissions: { create: perms },
      },
    });
    return { id: group.id, name: group.name };
  }

  async updateGroup(id: string, dto: UpdateGroupDto) {
    await this.findGroupOrThrow(id);
    if (dto.name) await this.assertNameFree(dto.name, id);
    await this.prisma.accessGroup.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description === undefined ? undefined : dto.description.trim() || null,
      },
    });
    return { success: true };
  }

  async deleteGroup(id: string) {
    const group = await this.findGroupOrThrow(id);
    if (group.isSystem) {
      throw new BadRequestException(
        'Không thể xoá nhóm hệ thống. Có thể chỉnh sửa quyền bên trong nhưng không xoá được nhóm.',
      );
    }
    await this.prisma.accessGroup.delete({ where: { id } });
    return { success: true };
  }

  async setGroupPermissions(id: string, entries: PermissionEntryDto[]) {
    await this.findGroupOrThrow(id);
    const perms = this.validatePermissions(entries);
    await this.prisma.$transaction([
      this.prisma.accessGroupPermission.deleteMany({ where: { groupId: id } }),
      this.prisma.accessGroupPermission.createMany({
        data: perms.map((p) => ({ groupId: id, ...p })),
      }),
    ]);
    return { success: true, count: perms.length };
  }

  async listUsers(query: ListRbacUsersQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = query.q ? { email: { contains: query.q, mode: 'insensitive' as const } } : {};
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { email: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          role: true,
          disabledAt: true,
          accessGroups: {
            select: { group: { select: { id: true, name: true, linkedRole: true } } },
          },
          _count: { select: { permissionOverrides: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      total,
      page,
      pageSize,
      items: rows.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        disabled: Boolean(u.disabledAt),
        isRoot: u.id === ROOT_ADMIN_ID,
        groups: u.accessGroups.map((m) => m.group),
        overrideCount: u._count.permissionOverrides,
      })),
    };
  }

  async getUser(targetId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        email: true,
        role: true,
        accessGroups: { select: { group: { select: { id: true, name: true, linkedRole: true } } } },
        permissionOverrides: { select: { resource: true, action: true, effect: true } },
      },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    const eff = await this.permissions.effectiveFor(targetId);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isRoot: eff.isRoot,
      groups: user.accessGroups.map((g) => g.group),
      overrides: user.permissionOverrides,
      effective: eff.isRoot ? ['*'] : [...eff.keys].sort(),
    };
  }

  async setUserGroups(actorId: string, targetId: string, groupIds: string[]) {
    await this.assertCanEditTarget(actorId, targetId);
    const unique = [...new Set(groupIds)];
    const groups = await this.prisma.accessGroup.findMany({
      where: { id: { in: unique } },
      select: { id: true, linkedRole: true },
    });
    if (groups.length !== unique.length) {
      throw new BadRequestException('Có nhóm quyền không tồn tại');
    }
    if (groups.some((g) => g.linkedRole)) {
      throw new BadRequestException(
        'Nhóm hệ thống gắn role được áp dụng tự động theo role — không gán thủ công.',
      );
    }
    await this.prisma.$transaction([
      this.prisma.userAccessGroup.deleteMany({ where: { userId: targetId } }),
      this.prisma.userAccessGroup.createMany({
        data: unique.map((groupId) => ({ userId: targetId, groupId })),
      }),
    ]);
    return { success: true };
  }

  async setUserOverrides(actorId: string, targetId: string, entries: OverrideEntryDto[]) {
    await this.assertCanEditTarget(actorId, targetId);
    const normalized = entries.map((e) => {
      if (!isValidPermission(e.resource, e.action)) {
        throw new BadRequestException(`Quyền không hợp lệ: ${e.resource} · ${e.action}`);
      }
      return { resource: e.resource, action: e.action, effect: e.effect ?? null };
    });
    await this.prisma.$transaction(
      normalized.map((e) =>
        e.effect === null
          ? this.prisma.userPermissionOverride.deleteMany({
              where: { userId: targetId, resource: e.resource, action: e.action },
            })
          : this.prisma.userPermissionOverride.upsert({
              where: {
                userId_resource_action: {
                  userId: targetId,
                  resource: e.resource,
                  action: e.action,
                },
              },
              create: {
                userId: targetId,
                resource: e.resource,
                action: e.action,
                effect: e.effect,
              },
              update: { effect: e.effect },
            }),
      ),
    );
    return { success: true };
  }

  // Quyền của chính người đang đăng nhập — frontend dùng để ẩn/hiện menu và nút.
  async myPermissions(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true },
    });
    const eff = await this.permissions.effectiveFor(userId);
    return {
      role: user.role,
      isRoot: eff.isRoot,
      permissions: eff.isRoot
        ? allCatalogPermissions().map(([r, a]) => permissionKey(r, a))
        : [...eff.keys].sort(),
    };
  }

  private validatePermissions(entries: PermissionEntryDto[]) {
    const seen = new Set<string>();
    const out: { resource: ResourceKey; action: PermissionAction }[] = [];
    for (const e of entries) {
      if (!isValidPermission(e.resource, e.action)) {
        throw new BadRequestException(`Quyền không hợp lệ: ${e.resource} · ${e.action}`);
      }
      const key = permissionKey(e.resource, e.action);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ resource: e.resource as ResourceKey, action: e.action });
    }
    return out;
  }

  private async findGroupOrThrow(id: string) {
    const group = await this.prisma.accessGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Không tìm thấy nhóm quyền');
    return group;
  }

  private async assertNameFree(name: string, exceptId?: string) {
    const clash = await this.prisma.accessGroup.findUnique({ where: { name: name.trim() } });
    if (clash && clash.id !== exceptId) throw new ConflictException('Tên nhóm quyền đã tồn tại');
  }

  // Bảo vệ phân quyền: Root không bị ai chỉnh; chỉ Root được chỉnh quyền của
  // Quản trị viên; không ai tự chỉnh quyền của chính mình.
  private async assertCanEditTarget(actorId: string, targetId: string) {
    if (targetId === ROOT_ADMIN_ID) {
      throw new ForbiddenException(
        'Root Administrator có toàn quyền — không thể gán nhóm hay override quyền.',
      );
    }
    if (actorId === targetId) {
      throw new ForbiddenException('Không thể tự thay đổi quyền của chính mình.');
    }
    const [actor, target] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: actorId }, select: { role: true } }),
      this.prisma.user.findUnique({ where: { id: targetId }, select: { role: true } }),
    ]);
    if (!target) throw new NotFoundException('Không tìm thấy tài khoản');
    if (target.role === UserRole.ADMIN && actor?.role !== UserRole.ROOT_ADMIN) {
      throw new ForbiddenException('Chỉ Root Administrator được thay đổi quyền của Quản trị viên.');
    }
  }
}
