'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { ApiError } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePermissions } from '@/lib/use-permissions';
import { getOpsStatus, retryFailedWatermarkJobs, type OpsStatus } from '@/lib/admin-ops-client';

// SCR-25 — giám sát hàng đợi watermark, Auto-Approve kẹt, lỗi 5xx gần đây.
// Chỉ đọc số liệu; thử lại job lỗi là thao tác có ghi nhận audit.
export default function CmsOpsPage() {
  const { loading: userLoading } = useCurrentUser();
  const perms = usePermissions();
  const canRead = perms.can('system_ops', 'READ');
  const canRetry = perms.can('system_ops', 'UPDATE');

  const [status, setStatus] = useState<OpsStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const refresh = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    getOpsStatus()
      .then((st) => {
        if (cancelled) return;
        setStatus(st);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : 'Không tải được trạng thái');
      });
    return () => {
      cancelled = true;
    };
  }, [canRead, reloadKey]);

  async function retry() {
    setBusy(true);
    setError(null);
    try {
      const res = await retryFailedWatermarkJobs();
      setInfo(`Đã đưa ${res.retryRequested} job lỗi về hàng đợi chạy lại.`);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thử lại được job');
    } finally {
      setBusy(false);
    }
  }

  if (!userLoading && !perms.loading && !canRead) {
    return (
      <CmsShell active="/cms/ops">
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

  const q = status?.watermarkQueue;
  const alerts = status
    ? [
        status.overdueAutoApprove > 0 && `${status.overdueAutoApprove} Proof quá hạn Auto-Approve`,
        status.stuckWatermark > 0 && `${status.stuckWatermark} Proof kẹt watermark > 10 phút`,
        (q?.failed ?? 0) > 0 && `${q?.failed} job watermark lỗi`,
        status.serverErrors24h > 0 && `${status.serverErrors24h} lỗi 5xx trong 24 giờ`,
      ].filter(Boolean)
    : [];

  return (
    <CmsShell active="/cms/ops">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Giám sát vận hành</h3>
            <p className="mt-1 text-xs text-slate-500">
              Hàng đợi watermark, cronjob Auto-Approve và lỗi máy chủ.
              {status && ` Cập nhật lúc ${new Date(status.checkedAt).toLocaleTimeString('vi-VN')}.`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh}>
              Làm mới
            </Button>
            {canRetry && (q?.failed ?? 0) > 0 && (
              <Button variant="gold" size="sm" disabled={busy} onClick={retry}>
                Chạy lại job lỗi
              </Button>
            )}
          </div>
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

        {!status ? (
          <p className="py-10 text-center text-sm text-slate-400">Đang tải...</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {alerts.length === 0 ? (
                <Badge tone="positive">Không có cảnh báo</Badge>
              ) : (
                alerts.map((a) => (
                  <Badge key={String(a)} tone="critical">
                    {a}
                  </Badge>
                ))
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Stat label="Đang chờ" value={q?.waiting ?? 0} />
              <Stat label="Đang chạy" value={q?.active ?? 0} />
              <Stat label="Trì hoãn" value={q?.delayed ?? 0} />
              <Stat
                label="Lỗi"
                value={q?.failed ?? 0}
                tone={(q?.failed ?? 0) > 0 ? 'critical' : undefined}
              />
              <Stat label="Hoàn thành" value={q?.completed ?? 0} />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-2 text-xs font-bold text-slate-700">
                Job watermark lỗi (9 gần nhất)
              </div>
              <Table>
                <Thead>
                  <Th>Job</Th>
                  <Th>Proof</Th>
                  <Th>Số lần thử</Th>
                  <Th>Lý do lỗi</Th>
                  <Th>Lỗi lúc</Th>
                </Thead>
                <Tbody>
                  {status.failedJobs.length === 0 ? (
                    <tr>
                      <Td colSpan={5} className="py-6 text-center text-slate-400">
                        Không có job lỗi.
                      </Td>
                    </tr>
                  ) : (
                    status.failedJobs.map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50">
                        <Td className="font-mono text-[11px]">{j.id}</Td>
                        <Td className="font-mono text-[11px] text-slate-500">
                          {j.submissionId.slice(0, 8)}
                        </Td>
                        <Td className="text-xs">{j.attemptsMade}</Td>
                        <Td
                          className="max-w-md truncate text-xs text-rose-700"
                          title={j.failedReason}
                        >
                          {j.failedReason}
                        </Td>
                        <Td className="whitespace-nowrap font-mono text-[11px] text-slate-500">
                          {j.failedAt ? new Date(j.failedAt).toLocaleString('vi-VN') : '—'}
                        </Td>
                      </tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </div>
          </>
        )}
      </div>
    </CmsShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'critical' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p
        className={`mt-1 font-mono text-lg font-extrabold ${tone === 'critical' ? 'text-rose-600' : 'text-slate-900'}`}
      >
        {value}
      </p>
    </div>
  );
}
