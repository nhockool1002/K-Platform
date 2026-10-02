'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAccessToken } from './auth-client';
import { getWallet, type Wallet } from './wallet-client';

interface UseWalletResult {
  wallet: Wallet | null;
  loading: boolean;
  refresh: () => void;
}

// Dùng ở AppShell (badge số dư) và các trang Dashboard/Ví — không redirect
// về /login khi chưa đăng nhập (khác useCurrentUser), vì AppShell chỉ hiển
// thị "···" cho tới khi có token; trang nào cần bắt buộc đăng nhập đã tự lo
// redirect qua useCurrentUser() của chính nó.
export function useWallet(): UseWalletResult {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  // Lazy init: không có token thì không bao giờ loading (không gọi setState
  // đồng bộ ngay trong effect — tránh react-hooks/set-state-in-effect).
  const [loading, setLoading] = useState<boolean>(() => Boolean(getAccessToken()));
  const [reloadTick, setReloadTick] = useState(0);

  const refresh = useCallback(() => setReloadTick((t) => t + 1), []);

  useEffect(() => {
    if (!getAccessToken()) return;

    let cancelled = false;
    getWallet()
      .then((w) => {
        if (!cancelled) setWallet(w);
      })
      .catch(() => {
        // Badge ví im lặng khi lỗi — trang Ví chính (/wallet) tự hiện error banner.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  return { wallet, loading, refresh };
}
