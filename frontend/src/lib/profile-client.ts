'use client';

// Client hồ sơ người dùng (backend/src/profile). Email KHÔNG đổi được qua đây.

import { ApiError, apiFetch, getAccessToken } from './auth-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface MyProfile {
  id: string;
  email: string;
  role: string;
  activeMode: 'A' | 'B';
  trustScore: number;
  serviceActivated: boolean;
  fullName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  province: string | null;
  occupation: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

export interface UpdateProfileInput {
  fullName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  province?: string;
  occupation?: string;
  bio?: string;
}

export const getMyProfile = () => apiFetch<MyProfile>('/profile/me', { auth: true });

export const updateMyProfile = (input: UpdateProfileInput) =>
  apiFetch<MyProfile>('/profile/me', { method: 'PATCH', auth: true, body: JSON.stringify(input) });

export async function uploadAvatar(file: File): Promise<MyProfile> {
  const formData = new FormData();
  formData.append('file', file);
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/profile/me/avatar`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.message ?? 'Không tải được ảnh');
  return data as MyProfile;
}

// Ảnh đại diện lưu dạng đường dẫn tương đối (/uploads/...) trên API server.
export function avatarSrc(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  return `${API_URL.replace(/\/api\/v1\/?$/, '')}${avatarUrl}`;
}
