import { SetMetadata } from '@nestjs/common';
import type { PermissionAction } from '../prisma/client.js';
import type { ResourceKey } from './permission-catalog.js';

export const PERMISSION_KEY = 'required-permissions';

export interface PermissionRequirement {
  resource: ResourceKey;
  action: PermissionAction;
}

// Route cần TẤT CẢ các quyền liệt kê. Dùng cùng PermissionsGuard.
export const RequirePermission = (...requirements: [ResourceKey, PermissionAction][]) =>
  SetMetadata(
    PERMISSION_KEY,
    requirements.map(([resource, action]) => ({ resource, action }) as PermissionRequirement),
  );
