import { Global, Module } from '@nestjs/common';
import { RbacController } from './rbac.controller.js';
import { RbacService } from './rbac.service.js';
import { PermissionService } from './permission.service.js';
import { PermissionsGuard } from './permissions.guard.js';

@Global()
@Module({
  controllers: [RbacController],
  providers: [RbacService, PermissionService, PermissionsGuard],
  exports: [PermissionService, PermissionsGuard],
})
export class RbacModule {}
