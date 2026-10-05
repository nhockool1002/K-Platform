import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/permissions.guard.js';
import { RequirePermission } from '../rbac/require-permission.decorator.js';
import { RootAdminTargetGuard } from '../common/guards/root-admin-target.guard.js';
import { RootAdminSelfOnlyGuard } from '../common/guards/root-admin-self-only.guard.js';
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
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @RequirePermission(['accounts', 'READ'])
  @Get()
  list() {
    return this.users.list();
  }

  @RequirePermission(['accounts', 'READ'])
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.users.getOne(id);
  }

  @RequirePermission(['accounts', 'CREATE'])
  @Post()
  create(@CurrentUser() actor: AccessTokenPayload, @Body() dto: CreateAccountDto) {
    return this.users.create(actor.sub, actor.role, dto);
  }

  // Sửa email/mật khẩu — Root chỉ tự sửa được chính mình, không ai khác
  // đụng vào Root được (RootAdminSelfOnlyGuard, khác guard "chặn tuyệt đối"
  // dùng cho role/active bên dưới).
  @RequirePermission(['accounts', 'UPDATE'])
  @Patch(':id/profile')
  @UseGuards(RootAdminSelfOnlyGuard)
  updateProfile(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAccountProfileDto,
  ) {
    return this.users.updateProfile(actor.sub, id, dto);
  }

  // Kích hoạt/Vô hiệu hoá — chặn tuyệt đối trên Root (kể cả Root tự khoá
  // chính mình), tránh tự khoá không ai mở lại được.
  @RequirePermission(['accounts', 'UPDATE'])
  @Patch(':id/active')
  @UseGuards(RootAdminTargetGuard)
  setActive(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: SetAccountActiveDto,
  ) {
    return this.users.setActive(actor.sub, id, dto.active);
  }

  @RequirePermission(['accounts', 'UPDATE'])
  @Patch(':id/role')
  @UseGuards(RootAdminTargetGuard)
  updateRole(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.users.updateRole(actor.sub, actor.role, id, dto.role);
  }

  @RequirePermission(['accounts', 'DELETE'])
  @Delete(':id')
  @UseGuards(RootAdminTargetGuard)
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id') id: string) {
    return this.users.remove(actor.sub, actor.role, id);
  }
}
