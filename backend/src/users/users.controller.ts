import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
// @prisma/client là CommonJS; dưới Node ESM named import không resolve được.
import pkg from '@prisma/client';
const { UserRole } = pkg;
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { RootAdminTargetGuard } from '../common/guards/root-admin-target.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ROOT_ADMIN_ID } from '../common/constants.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';

// P1-08/P1-09 — demo cụ thể cho RBAC guard + bảo vệ Root Administrator.
// CMS RBAC đầy đủ (SCR-12) thuộc Phase 7; ở đây chỉ dựng API nền tảng.
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ROOT_ADMIN)
  async list() {
    const users = await this.prisma.user.findMany({
      select: { id: true, email: true, role: true, activeMode: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u) => ({ ...u, isRootAdmin: u.id === ROOT_ADMIN_ID }));
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN, UserRole.ROOT_ADMIN)
  @UseGuards(RootAdminTargetGuard)
  async updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    if (dto.role === UserRole.ROOT_ADMIN) {
      throw new ForbiddenException('Không thể gán role ROOT_ADMIN qua API');
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: { id: true, email: true, role: true },
    });
    return user;
  }

  @Delete(':id')
  @Roles(UserRole.ROOT_ADMIN)
  @UseGuards(RootAdminTargetGuard)
  async remove(@Param('id') id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}
