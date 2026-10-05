'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { formatKpoint } from '@/lib/format';
import { ApiError } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePermissions } from '@/lib/use-permissions';
import {
  decideWithdrawal,
  listAdminWithdrawals,
  type AdminWithdrawal,
} from '@/lib/admin-withdrawals-client';
import type { WithdrawalStatus } from '@/lib/wallet-client';

const STATUS_TABS: { key: WithdrawalStatus | 'ALL'; label: string }[] = [
  { key: 'PENDING', label: 'Đang chờ duyệt' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'REJECTED', label: 'Đã từ chối' },
  { key: 'ALL', label: 'Tất cả' },
];

const STATUS_TONE: Record<WithdrawalStatus, BadgeTone> = {
  PENDING: 'warning',
  APPROVED: 'positive',
  REJECTED: 'critical',
};

const STATUS_LABEL: Record<WithdrawalStatus, string> = {
  PENDING: 'Đang chờ',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
};

export default function CmsWithdrawalsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const perms = usePermissions();
  const permsLoading = perms.loading;
  const isAdmin = perms.can('withdrawals', 'READ');
  const canApprove = perms.can('withdrawals', 'APPROVE');

  const [tab, setTab] = useState<WithdrawalStatus | 'ALL'>('PENDING');
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;
    listAdminWithdrawals(tab === 'ALL' ? undefined : tab)
      .then((data) => {
        if (cancelled) return;
        setWithdrawals(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Không tải được danh sách lệnh rút');
        setWithdrawals([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, tab, reloadTick]);

  async function handleDecision(id: string, decision: 'APPROVE' | 'REJECT') {
    setProcessingId(id);
    setError(null);
    try {
      await decideWithdrawal(id, decision);
      setReloadTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không xử lý được lệnh rút');
    } finally {
      setProcessingId(null);
    }
  }

  if (!userLoading && !permsLoading && !isAdmin) {
    return (
      <CmsShell active="/cms/withdrawals">
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
    <CmsShell active="/cms/withdrawals">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Yêu Cầu Rút Tiền</h3>
            <p className="mt-1 text-xs text-slate-500">
              Duyệt lệnh rút KPoint về ngân hàng của Tài khoản người dùng. Approve trừ thật số dư
              ví; Từ chối chỉ giải phóng phần KPoint đang bị khoá, không trừ ví.
            </p>
          </div>
        </div>

        <div className="flex gap-1.5">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                tab === t.key
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        {withdrawals === null ? (
          <p className="py-6 text-center text-xs text-slate-500">Đang tải...</p>
        ) : withdrawals.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">Không có lệnh rút nào.</p>
        ) : (
          <Table>
            <Thead>
              <Th>Người yêu cầu</Th>
              <Th>Số KPoint</Th>
              <Th>Ngân hàng nhận</Th>
              <Th>Trạng thái</Th>
              <Th>Thời gian</Th>
              <Th className="text-right">Thao tác</Th>
            </Thead>
            <Tbody>
              {withdrawals.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50/70">
                  <Td className="font-bold text-slate-800">{w.user.email}</Td>
                  <Td className="font-mono font-bold text-emerald-600">
                    {formatKpoint(Number(w.amountKpoint))}
                  </Td>
                  <Td className="font-mono text-xs">
                    {w.bankId} • {w.bankAccountNumber}
                    <div className="text-[11px] text-slate-400">{w.bankAccountName}</div>
                  </Td>
                  <Td>
                    <Badge tone={STATUS_TONE[w.status]}>{STATUS_LABEL[w.status]}</Badge>
                  </Td>
                  <Td className="text-xs text-slate-500">
                    {new Date(w.createdAt).toLocaleString('vi-VN')}
                  </Td>
                  <Td className="text-right">
                    {w.status === 'PENDING' && canApprove ? (
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="dark"
                          size="sm"
                          disabled={processingId === w.id}
                          onClick={() => handleDecision(w.id, 'APPROVE')}
                        >
                          Duyệt
                        </Button>
                        <Button
                          variant="danger-ghost"
                          size="sm"
                          disabled={processingId === w.id}
                          onClick={() => handleDecision(w.id, 'REJECT')}
                        >
                          Từ chối
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">Đã xử lý</span>
                    )}
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </CmsShell>
  );
}
