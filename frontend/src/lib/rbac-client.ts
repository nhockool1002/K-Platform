'use client';

// Client cho phân quyền (backend/src/rbac). Quyền thực thi do backend kiểm tra; client chỉ
// dùng để ẩn/hiện menu và nút.

import { apiFetch } from './auth-client';

export type PermissionAction = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE';
export type OverrideEffect = 'ALLOW' | 'DENY';

export interface CatalogResource {
  resource: string;
  label: string;
  area: string;
  actions: PermissionAction[];
}

export interface PermissionEntry {
  resource: string;
  action: PermissionAction;
}

export interface AccessGroup {
  id: string;
  name: string;
  description: string | null;
  linkedRole: 'ADMIN' | 'MODERATOR' | null;
  isSystem: boolean;
  memberCount: number;
  permissions: PermissionEntry[];
}

export interface RbacUserRow {
  id: string;
  email: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN' | 'ROOT_ADMIN';
  disabled: boolean;
  isRoot: boolean;
  groups: { id: string; name: string; linkedRole: string | null }[];
  overrideCount: number;
}

export interface RbacUserDetail {
  id: string;
  email: string;
  role: string;
  isRoot: boolean;
  groups: { id: string; name: string; linkedRole: string | null }[];
  overrides: (PermissionEntry & { effect: OverrideEffect })[];
  effective: string[];
}

export interface MyPermissions {
  role: string;
  isRoot: boolean;
  permissions: string[];
}

export const getMyPermissions = () => apiFetch<MyPermissions>('/admin/rbac/me', { auth: true });
export const getCatalog = () => apiFetch<CatalogResource[]>('/admin/rbac/catalog', { auth: true });
export const listGroups = () => apiFetch<AccessGroup[]>('/admin/rbac/groups', { auth: true });

export const createGroup = (input: {
  name: string;
  description?: string;
  permissions: PermissionEntry[];
}) =>
  apiFetch<{ id: string; name: string }>('/admin/rbac/groups', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  });

export const updateGroup = (id: string, input: { name?: string; description?: string }) =>
  apiFetch(`/admin/rbac/groups/${id}`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(input),
  });

export const deleteGroup = (id: string) =>
  apiFetch(`/admin/rbac/groups/${id}`, { method: 'DELETE', auth: true });

export const setGroupPermissions = (id: string, permissions: PermissionEntry[]) =>
  apiFetch(`/admin/rbac/groups/${id}/permissions`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ permissions }),
  });

export const listRbacUsers = (params: { q?: string; page?: number; pageSize?: number }) => {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  return apiFetch<{ total: number; page: number; pageSize: number; items: RbacUserRow[] }>(
    `/admin/rbac/users?${qs.toString()}`,
    { auth: true },
  );
};

export const getRbacUser = (id: string) =>
  apiFetch<RbacUserDetail>(`/admin/rbac/users/${id}`, { auth: true });

export const setUserGroups = (id: string, groupIds: string[]) =>
  apiFetch(`/admin/rbac/users/${id}/groups`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ groupIds }),
  });

export const setUserOverrides = (
  id: string,
  overrides: (PermissionEntry & { effect: OverrideEffect | null })[],
) =>
  apiFetch(`/admin/rbac/users/${id}/overrides`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ overrides }),
  });
