import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service.js';
import { CreatePermissionDto } from './dto/create-permission.dto.js';
import { UserRole } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

// P7-06/SCR-12 — CMS RBAC: danh sách quyền hạn tham khảo theo vai trò.
@Controller('admin/permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ROOT_ADMIN)
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get()
  list() {
    return this.permissions.list();
  }

  @Post()
  create(@Body() dto: CreatePermissionDto) {
    return this.permissions.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.permissions.remove(id);
  }
}
