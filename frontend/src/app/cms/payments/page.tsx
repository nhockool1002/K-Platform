'use client';

import { useEffect, useState } from 'react';
import { Eye, ShieldAlert } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { formatKpoint } from '@/lib/format';
import { ApiError } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import type { BmcTopupStatus } from '@/lib/bmc-client';
import {
  decideBmcTopup,
  listReconciliation,
  openBmcReceipt,
  type ReconciliationRow,
  type TopupSource,
} from '@/lib/admin-topups-client';

type SourceFilter = 'ALL' | TopupSource;
type StatusFilter = 'ALL' | BmcTopupStatus;

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả trạng thái' },
  { key: 'AWAITING_PAYMENT', label: 'Chờ biên lai' },
  { key: 'PENDING_MANUAL_VERIFICATION', label: 'Đang đối soát' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'REJECTED', label: 'Từ chối' },
];

const STATUS_TONE: Record<BmcTopupStatus | 'CREDITED', BadgeTone> = {
  AWAITING_PAYMENT: 'neutral',
  PENDING_MANUAL_VERIFICATION: 'warning',
  APPROVED: 'positive',
  REJECTED: 'critical',
  CREDITED: 'positive',
};

const STATUS_LABEL: Record<BmcTopupStatus | 'CREDITED', string> = {
  AWAITING_PAYMENT: 'Chờ biên lai',
  PENDING_MANUAL_VERIFICATION: 'Đang đối soát',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CREDITED: 'Đã cộng ví',
};

export default function CmsPaymentsReconciliationPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROOT_ADMIN';

  const [source, setSource] = useState<SourceFilter>('ALL');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [rows, setRows] = useState<ReconciliationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [rejecting, setRejecting] = useState<ReconciliationRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    listReconciliation({
      source: source === 'ALL' ? undefined : source,
      status: status === 'ALL' ? undefined : status,
    })
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Không tải được danh sách nạp tiền');
        setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, source, status, reloadTick]);

  async function handleApprove(row: ReconciliationRow) {
    const ok = window.confirm(
      `Duyệt giao dịch ${row.reference}?\nCộng ${formatKpoint(Number(row.kpointAmount))} vào ví ${row.user.email}.`,
    );
    if (!ok) return;
    setProcessingId(row.id);
    setError(null);
    try {
      await decideBmcTopup(row.id, 'APPROVE');
      setReloadTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không duyệt được giao dịch');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRejectConfirm() {
    if (!rejecting) return;
    if (!rejectReason.trim()) {
      setError('Vui lòng nhập lý do từ chối');
      return;
    }
    setProcessingId(rejecting.id);
    setError(null);
    try {
      await decideBmcTopup(rejecting.id, 'REJECT', rejectReason.trim());
      setRejecting(null);
      setRejectReason('');
      setReloadTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không từ chối được giao dịch');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleViewReceipt(row: ReconciliationRow) {
    setError(null);
    try {
      await openBmcReceipt(row.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không mở được biên lai');
    }
  }

  if (!userLoading && !isAdmin) {
    return (
      <CmsShell active="/cms/payments">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-bold text-slate-800">Không đủ quyền truy cập</p>
          <p className="text-xs text-slate-500">
            Chỉ Admin hoặc Root Admin được đối soát nạp tiền.
          </p>
        </div>
      </CmsShell>
    );
  }

  return (
    <CmsShell active="/cms/payments">
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">Đối Soát Nạp Tiền</h3>
          <p className="mt-1 text-xs text-slate-500">
            Toàn bộ giao dịch nạp KPoint: <strong>Nội địa (SePay)</strong> cộng tự động, và{' '}
            <strong>Quốc tế (Buy Me a Coffee)</strong> chờ duyệt thủ công. Đối chiếu mã{' '}
            <span className="font-mono">KPL-</span> trong lời nhắn BMC với biên lai trước khi duyệt.
            Quá hạn đối soát (B-04) được đánh dấu đỏ.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: 'ALL', label: 'Tất cả' },
              { key: 'SEPAY', label: 'Nội địa (SePay)' },
              { key: 'BMC', label: 'Quốc tế (BMC)' },
            ] as { key: SourceFilter; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setSource(t.key)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                source === t.key
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
          {source !== 'SEPAY' && (
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        {rows === null ? (
          <p className="py-6 text-center text-xs text-slate-500">Đang tải...</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">Không có giao dịch nào.</p>
        ) : (
          <Table>
            <Thead>
              <Th>Thời gian</Th>
              <Th>Người nạp</Th>
              <Th>Nguồn</Th>
              <Th>Mã đối soát</Th>
              <Th>Gói · USD</Th>
              <Th>Tỷ giá (VNĐ/USD)</Th>
              <Th>KPoint</Th>
              <Th>Trạng thái</Th>
              <Th>Hạn đối soát</Th>
              <Th className="text-right">Thao tác</Th>
            </Thead>
            <Tbody>
              {rows.map((r) => {
                const awaitingReview =
                  r.source === 'BMC' && r.status === 'PENDING_MANUAL_VERIFICATION';
                return (
                  <tr key={`${r.source}-${r.id}`} className="hover:bg-slate-50/70">
                    <Td className="text-xs text-slate-500">
                      {new Date(r.createdAt).toLocaleString('vi-VN')}
                    </Td>
                    <Td className="font-bold text-slate-800">{r.user.email}</Td>
                    <Td>
                      <Badge tone={r.source === 'BMC' ? 'gold' : 'info'}>
                        {r.source === 'BMC' ? 'Quốc tế' : 'SePay'}
                      </Badge>
                    </Td>
                    <Td className="font-mono text-xs">{r.reference}</Td>
                    <Td className="text-xs">
                      {r.amountUsd ? (
                        <>
                          <span className="font-bold">${Number(r.amountUsd).toFixed(2)}</span>
                          <div className="text-[10px] text-slate-400">{r.packageName}</div>
                        </>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td className="font-mono text-xs">
                      {r.usdToVnd ? Number(r.usdToVnd).toLocaleString('vi-VN') : '—'}
                    </Td>
                    <Td className="font-mono font-bold text-emerald-600">
                      {formatKpoint(Number(r.kpointAmount))}
                    </Td>
                    <Td>
                      <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                      {r.rejectReason && (
                        <div className="mt-1 max-w-[180px] text-[10px] text-rose-600">
                          Lý do: {r.rejectReason}
                        </div>
                      )}
                      {r.verifiedBy && (
                        <div className="mt-1 text-[10px] text-slate-400">
                          bởi {r.verifiedBy.email}
                        </div>
                      )}
                    </Td>
                    <Td className="text-xs">
                      {r.reviewDeadline ? (
                        <>
                          <div className="text-slate-600">
                            {new Date(r.reviewDeadline).toLocaleString('vi-VN')}
                          </div>
                          {r.isOverdue && (
                            <Badge tone="critical" className="mt-1">
                              Quá hạn
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td className="text-right">
                      {r.source === 'BMC' && r.hasReceipt && (
                        <Button variant="ghost" size="sm" onClick={() => handleViewReceipt(r)}>
                          <Eye className="h-3.5 w-3.5" />
                          Biên lai
                        </Button>
                      )}
                      {awaitingReview ? (
                        <div className="mt-1 flex justify-end gap-1.5">
                          <Button
                            variant="dark"
                            size="sm"
                            disabled={processingId === r.id}
                            onClick={() => handleApprove(r)}
                          >
                            Duyệt
                          </Button>
                          <Button
                            variant="danger-ghost"
                            size="sm"
                            disabled={processingId === r.id}
                            onClick={() => {
                              setRejecting(r);
                              setRejectReason('');
                            }}
                          >
                            Từ chối
                          </Button>
                        </div>
                      ) : null}
                    </Td>
                  </tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </div>

      <Modal
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        title={`Từ chối giao dịch ${rejecting?.reference ?? ''}`}
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            User sẽ thấy lý do này ở lịch sử nạp. Lý do bắt buộc (vd. không tìm thấy mã KPL- trên
            BMC, biên lai không khớp số tiền).
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
            placeholder="Nhập lý do từ chối..."
          />
          <Button
            variant="danger"
            className="w-full"
            disabled={processingId === rejecting?.id}
            onClick={handleRejectConfirm}
          >
            Xác nhận từ chối
          </Button>
        </div>
      </Modal>
    </CmsShell>
  );
}
