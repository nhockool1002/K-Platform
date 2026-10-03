'use client';

// Client-side auth storage + fetch helper cho API thật ở backend NestJS.
// Lưu token trong localStorage — tạm đủ dùng cho Phase 1 (hardening/HttpOnly
// cookie thuộc Phase 8).

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const ACCESS_TOKEN_KEY = 'kplatform.accessToken';
const REFRESH_TOKEN_KEY = 'kplatform.refreshToken';

export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN' | 'ROOT_ADMIN';
export type ActiveMode = 'A' | 'B';

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
  activeMode: ActiveMode;
  trustScore: number;
  serviceActivated: boolean;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken?: string): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = false, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = getAccessToken();
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_URL}${path}`, { ...rest, headers: finalHeaders });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
  }

  return data as T;
}

export async function login(email: string, password: string) {
  const data = await apiFetch<{ user: CurrentUser; accessToken: string; refreshToken: string }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
  );
  setTokens(data.accessToken, data.refreshToken);
  return data.user;
}

export async function register(email: string, password: string, activeMode: ActiveMode) {
  const data = await apiFetch<{ user: CurrentUser; accessToken: string; refreshToken: string }>(
    '/auth/register',
    { method: 'POST', body: JSON.stringify({ email, password, activeMode }) },
  );
  setTokens(data.accessToken, data.refreshToken);
  return data.user;
}

export async function fetchCurrentUser() {
  return apiFetch<CurrentUser>('/auth/me', { auth: true });
}

export async function switchMode(targetRole: ActiveMode) {
  const data = await apiFetch<{ success: boolean; activeRole: ActiveMode; accessToken: string }>(
    '/auth/switch-mode',
    { method: 'POST', auth: true, body: JSON.stringify({ targetRole }) },
  );
  setTokens(data.accessToken);
  return data.activeRole;
}

export async function forgotPassword(email: string) {
  return apiFetch<{ message: string; devResetToken?: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string) {
  return apiFetch<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}

export function logout() {
  clearTokens();
}
