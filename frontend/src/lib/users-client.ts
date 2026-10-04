'use client';

// Client cho CMS RBAC (SCR-12) + CMS Quản Trị Tài Khoản — backend/src/users.
// Chỉ Admin/Root Admin.

import { apiFetch } from './auth-client';
import type { UserRole } from './auth-client';

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  activeMode: 'A' | 'B';
  trustScore: number;
  disabledAt: string | null;
  serviceActivatedAt: string | null;
  createdAt: string;
  isRootAdmin: boolean;
}

export interface CreateAccountInput {
  email: string;
  password: string;
  role?: UserRole;
  activeMode?: 'A' | 'B';
}

export interface UpdateAccountProfileInput {
  email?: string;
  password?: string;
}

export async function listUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>('/admin/users', { auth: true });
}

export async function getUser(id: string): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${id}`, { auth: true });
}

export async function createAccount(input: CreateAccountInput): Promise<AdminUser> {
  return apiFetch<AdminUser>('/admin/users', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function updateAccountProfile(
  id: string,
  input: UpdateAccountProfileInput,
): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${id}/profile`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function setAccountActive(id: string, active: boolean): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${id}/active`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ active }),
  });
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
