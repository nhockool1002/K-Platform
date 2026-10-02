import type { ActiveMode, UserRole } from '@prisma/client';

// Access token claims — FN-AUTH-01: đổi `activeMode` bằng cách phát hành
// access token mới (switch-mode), không cần đăng nhập lại / đổi refresh token.
export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  activeMode: ActiveMode;
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
}
