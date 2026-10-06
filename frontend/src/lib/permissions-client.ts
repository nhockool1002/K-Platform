'use client';

// Client cho CMS RBAC — danh sách quyền hạn tham khảo theo vai trò (P7-06,
// backend/src/permissions). KHÔNG dùng để enforce access, chỉ mô tả.

import { apiFetch } from './auth-client';

export interface RolePermission {
  id: string;
  roleName: string;
  permissionCode: string;
}

export async function listPermissions(): Promise<RolePermission[]> {
  return apiFetch<RolePermission[]>('/admin/permissions', { auth: true });
}

export async function createPermission(
  roleName: string,
  permissionCode: string,
): Promise<RolePermission> {
  return apiFetch<RolePermission>('/admin/permissions', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ roleName, permissionCode }),
  });
}

export async function deletePermission(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/admin/permissions/${id}`, {
    method: 'DELETE',
    auth: true,
  });
}
