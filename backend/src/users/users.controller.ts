import { Body, Controller, Delete, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { UserRole } from '../prisma/client.js';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { RootAdminTargetGuard } from '../common/guards/root-admin-target.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';

// P1-08/P1-09 — API nền tảng cho RBAC guard + bảo vệ Root Administrator.
// P7-05/P7-06/P7-07/P7-10/P7-11 — CMS RBAC đầy đủ (SCR-12) dùng các route này.
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ROOT_ADMIN)
  list() {
    return this.users.list();
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN, UserRole.ROOT_ADMIN)
  @UseGuards(RootAdminTargetGuard)
  updateRole(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: Request,
  ) {
    return this.users.updateRole(actor.sub, actor.role, id, dto.role, req.ip ?? null);
  }

  @Delete(':id')
  @Roles(UserRole.ROOT_ADMIN)
  @UseGuards(RootAdminTargetGuard)
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id') id: string, @Req() req: Request) {
    return this.users.remove(actor.sub, id, req.ip ?? null);
  }
}
