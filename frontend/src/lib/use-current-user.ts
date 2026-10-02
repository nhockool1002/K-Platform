'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, fetchCurrentUser, getAccessToken, type CurrentUser } from './auth-client';

interface UseCurrentUserResult {
  user: CurrentUser | null;
  loading: boolean;
}

// Dùng trong các trang yêu cầu đăng nhập (dashboard Bên A/B, CMS...).
// Chuyển hướng về /login nếu chưa có token hoặc token hết hạn (401).
export function useCurrentUser(): UseCurrentUserResult {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }

    fetchCurrentUser()
      .then((u) => {
        if (!cancelled) {
          setUser(u);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login');
          return;
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, loading };
}
