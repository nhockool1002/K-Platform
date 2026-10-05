'use client';

import { useEffect, useState } from 'react';
import { getAccessToken } from './auth-client';
import { getMyPermissions, type MyPermissions, type PermissionAction } from './rbac-client';

interface PermissionsState {
  loading: boolean;
  isRoot: boolean;
  keys: Set<string>;
  can: (resource: string, action: PermissionAction) => boolean;
}

// Quyền của người đang đăng nhập để ẩn/hiện menu và nút. Backend vẫn kiểm tra lại mọi request.
export function usePermissions(): PermissionsState {
  const hasToken = typeof window !== 'undefined' && getAccessToken() !== null;
  const [result, setResult] = useState<{ data: MyPermissions | null; failed: boolean }>({
    data: null,
    failed: false,
  });

  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;
    getMyPermissions()
      .then((p) => {
        if (!cancelled) setResult({ data: p, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ data: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [hasToken]);

  const loading = hasToken && result.data === null && !result.failed;
  const isRoot = result.data?.isRoot ?? false;
  const keys = new Set(result.data?.permissions ?? []);
  return {
    loading,
    isRoot,
    keys,
    can: (resource, action) => isRoot || keys.has(`${resource}:${action}`),
  };
}
