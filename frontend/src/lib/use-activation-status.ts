'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAccessToken } from './auth-client';
import { getActivationStatus, type ActivationStatus } from './account-client';

interface UseActivationStatusResult {
  status: ActivationStatus | null;
  loading: boolean;
  refresh: () => void;
}

// Dùng ở Dashboard Tài khoản Dịch vụ — không redirect khi chưa đăng nhập,
// giống use-wallet.ts (trang tự lo auth qua useCurrentUser()).
export function useActivationStatus(): UseActivationStatusResult {
  const [status, setStatus] = useState<ActivationStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(getAccessToken()));
  const [reloadTick, setReloadTick] = useState(0);

  const refresh = useCallback(() => setReloadTick((t) => t + 1), []);

  useEffect(() => {
    if (!getAccessToken()) return;

    let cancelled = false;
    getActivationStatus()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  return { status, loading, refresh };
}
