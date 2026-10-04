import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { UserRole } from '../prisma/client.js';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { RootAdminTargetGuard } from '../common/guards/root-admin-target.guard.js';
import { RootAdminSelfOnlyGuard } from '../common/guards/root-admin-self-only.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { UpdateAccountProfileDto } from './dto/update-account-profile.dto.js';
import { SetAccountActiveDto } from './dto/set-account-active.dto.js';

// P1-08/P1-09 — API nền tảng cho RBAC guard + bảo vệ Root Administrator.
// P7-05/P7-06/P7-07/P7-10/P7-11 — CMS RBAC dùng list()/updateRole()/remove().
// CMS "Quản Trị Tài Khoản" (yêu cầu mới) — dùng create/getOne/updateProfile/
// setActive, CRUD đầy đủ + kích hoạt/vô hiệu hoá tài khoản. Chỉ Admin/Root
// Admin truy cập được toàn bộ controller này.
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ROOT_ADMIN)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.users.getOne(id);
  }

  @Post()
  create(
    @CurrentUser() actor: AccessTokenPayload,
    @Body() dto: CreateAccountDto,
    @Req() req: Request,
  ) {
    return this.users.create(actor.sub, actor.role, dto, req.ip ?? null);
  }

  // Sửa email/mật khẩu — Root chỉ tự sửa được chính mình, không ai khác
  // đụng vào Root được (RootAdminSelfOnlyGuard, khác guard "chặn tuyệt đối"
  // dùng cho role/active bên dưới).
  @Patch(':id/profile')
  @UseGuards(RootAdminSelfOnlyGuard)
  updateProfile(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAccountProfileDto,
    @Req() req: Request,
  ) {
    return this.users.updateProfile(actor.sub, id, dto, req.ip ?? null);
  }

  // Kích hoạt/Vô hiệu hoá — chặn tuyệt đối trên Root (kể cả Root tự khoá
  // chính mình), tránh tự khoá không ai mở lại được.
  @Patch(':id/active')
  @UseGuards(RootAdminTargetGuard)
  setActive(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: SetAccountActiveDto,
    @Req() req: Request,
  ) {
    return this.users.setActive(actor.sub, id, dto.active, req.ip ?? null);
  }

  @Patch(':id/role')
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
