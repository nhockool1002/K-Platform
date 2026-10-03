'use client';

// Client cho CMS RBAC (SCR-12 — backend/src/users). Chỉ Admin/Root Admin.

import { apiFetch } from './auth-client';
import type { UserRole } from './auth-client';

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  activeMode: 'A' | 'B';
  createdAt: string;
  isRootAdmin: boolean;
}

export async function listUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>('/admin/users', { auth: true });
}

export async function updateUserRole(id: string, role: UserRole): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${id}/role`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ role }),
  });
}

export async function deleteUser(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/admin/users/${id}`, { method: 'DELETE', auth: true });
}
