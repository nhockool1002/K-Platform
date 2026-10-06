import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RbacService } from './rbac.service.js';
import { ParseIdPipe } from './parse-id.pipe.js';
import { PermissionsGuard } from './permissions.guard.js';
import { RequirePermission } from './require-permission.decorator.js';
import {
  CreateGroupDto,
  ListRbacUsersQuery,
  SetGroupPermissionsDto,
  SetUserGroupsDto,
  SetUserOverridesDto,
  UpdateGroupDto,
} from './dto/rbac.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';

// SCR-12 — phân quyền theo nhóm + override riêng từng user. Mọi route cần quyền
// `rbac`, trừ /rbac/me (quyền của chính mình, ai đăng nhập cũng gọi được).
@Controller('admin/rbac')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get('me')
  myPermissions(@CurrentUser() user: AccessTokenPayload) {
    return this.rbac.myPermissions(user.sub);
  }

  @Get('catalog')
  @RequirePermission(['rbac', 'READ'])
  catalog() {
    return this.rbac.catalog();
  }

  @Get('groups')
  @RequirePermission(['rbac', 'READ'])
  listGroups() {
    return this.rbac.listGroups();
  }

  @Post('groups')
  @RequirePermission(['rbac', 'CREATE'])
  createGroup(@Body() dto: CreateGroupDto) {
    return this.rbac.createGroup(dto);
  }

  @Patch('groups/:id')
  @RequirePermission(['rbac', 'UPDATE'])
  updateGroup(@Param('id', ParseIdPipe) id: string, @Body() dto: UpdateGroupDto) {
    return this.rbac.updateGroup(id, dto);
  }

  @Delete('groups/:id')
  @RequirePermission(['rbac', 'DELETE'])
  deleteGroup(@Param('id', ParseIdPipe) id: string) {
    return this.rbac.deleteGroup(id);
  }

  @Put('groups/:id/permissions')
  @RequirePermission(['rbac', 'UPDATE'])
  setGroupPermissions(@Param('id', ParseIdPipe) id: string, @Body() dto: SetGroupPermissionsDto) {
    return this.rbac.setGroupPermissions(id, dto.permissions);
  }

  @Get('users')
  @RequirePermission(['rbac', 'READ'])
  listUsers(@Query() query: ListRbacUsersQuery) {
    return this.rbac.listUsers(query);
  }

  @Get('users/:id')
  @RequirePermission(['rbac', 'READ'])
  getUser(@Param('id', ParseIdPipe) id: string) {
    return this.rbac.getUser(id);
  }

  @Put('users/:id/groups')
  @RequirePermission(['rbac', 'UPDATE'])
  setUserGroups(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: SetUserGroupsDto,
  ) {
    return this.rbac.setUserGroups(actor.sub, id, dto.groupIds);
  }

  @Put('users/:id/overrides')
  @RequirePermission(['rbac', 'UPDATE'])
  setUserOverrides(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: SetUserOverridesDto,
  ) {
    return this.rbac.setUserOverrides(actor.sub, id, dto.overrides);
  }
}
