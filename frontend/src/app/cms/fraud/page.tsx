'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePermissions } from '@/lib/use-permissions';
import { listFraudClusters, setUserDisabled, type FraudCluster } from '@/lib/admin-fraud-client';

// SCR-24 — cụm nhiều Bên B khác nhau cùng thiết bị (fingerprint) hoặc cùng IP
// trong 1 Campaign: dấu hiệu 1 người nhiều tài khoản ăn nhiều slot. Admin xem
// và khoá tài khoản nghi vấn (chỉ khoá người dùng thường, không khoá Admin/Mod).
export default function CmsFraudPage() {
  const { loading: userLoading } = useCurrentUser();
  const perms = usePermissions();
  const canRead = perms.can('fraud', 'READ');
  const canUpdate = perms.can('fraud', 'UPDATE');

  const [clusters, setClusters] = useState<FraudCluster[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    listFraudClusters()
      .then((data) => {
        if (!cancelled) setClusters(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu');
      });
    return () => {
      cancelled = true;
    };
  }, [canRead, reloadKey]);

  async function toggle(userId: string, email: string, disabled: boolean) {
    setBusyId(userId);
    setError(null);
    try {
      await setUserDisabled(userId, disabled);
      setInfo(`${disabled ? 'Đã khoá' : 'Đã mở khoá'} ${email}.`);
      setTimeout(() => setInfo(null), 2500);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không cập nhật được tài khoản');
    } finally {
      setBusyId(null);
    }
  }

  if (!userLoading && !perms.loading && !canRead) {
    return (
      <CmsShell active="/cms/fraud">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-bold text-slate-800">Không đủ quyền truy cập</p>
          <p className="text-xs text-slate-500">
            Bạn chưa được cấp quyền truy cập chức năng này. Liên hệ quản trị viên để được cấp quyền.
          </p>
        </div>
      </CmsShell>
    );
  }

  return (
    <CmsShell active="/cms/fraud">
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">Chống gian lận</h3>
          <p className="mt-1 text-xs text-slate-500">
            Các cụm Bên B khác nhau cùng thiết bị hoặc cùng IP trong một Campaign. Đây là dấu hiệu
            cần kiểm tra, chưa phải kết luận gian lận: cùng một mạng gia đình hoặc công ty cũng có
            thể trùng IP.
          </p>
        </div>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {info}
          </p>
        )}

        {clusters === null ? (
          <p className="py-10 text-center text-sm text-slate-400">Đang tải...</p>
        ) : clusters.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white py-10 text-center text-sm text-slate-400">
            Chưa phát hiện cụm nghi vấn nào.
          </p>
        ) : (
          <div className="space-y-3">
            {clusters.map((c) => (
              <div
                key={`${c.kind}-${c.campaignId}-${c.signal}`}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge tone={c.kind === 'IP' ? 'warning' : 'purple'}>
                    {c.kind === 'IP' ? 'Trùng IP' : 'Trùng thiết bị'}
                  </Badge>
                  <span className="text-xs font-bold text-slate-800">
                    {c.campaignTitle ?? 'Campaign đã xoá'}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">{c.signal}</span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {c.publishers.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2"
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-800">{p.email}</span>
                        {p.disabledAt && <Badge tone="critical">Đã khoá</Badge>}
                      </div>
                      {canUpdate &&
                        (p.role !== 'USER' ? (
                          <span className="text-[11px] text-slate-400">
                            Quản trị viên/Mod: xử lý ở Quản trị tài khoản
                          </span>
                        ) : p.disabledAt ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId === p.id}
                            onClick={() => toggle(p.id, p.email, false)}
                          >
                            Mở khoá
                          </Button>
                        ) : (
                          <Button
                            variant="danger-ghost"
                            size="sm"
                            disabled={busyId === p.id}
                            onClick={() => toggle(p.id, p.email, true)}
                          >
                            Khoá tài khoản
                          </Button>
                        ))}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </CmsShell>
  );
}
