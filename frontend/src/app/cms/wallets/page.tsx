'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { formatKpoint } from '@/lib/format';
import { ApiError } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePermissions } from '@/lib/use-permissions';
import {
  adjustAdminWallet,
  listAdminWallets,
  listAdminWalletTransactions,
  type AdminWallet,
  type AdminWalletTx,
} from '@/lib/admin-wallets-client';

// SCR-23 — tra cứu ví & sổ cái người dùng. Điều chỉnh số dư phải kèm lý do,
// được ghi vào sổ cái (ADJUSTMENT) và audit log. Không trừ xuống dưới KPoint đang ký quỹ.
export default function CmsWalletsPage() {
  const { loading: userLoading } = useCurrentUser();
  const perms = usePermissions();
  const canRead = perms.can('wallets', 'READ');
  const canAdjust = perms.can('wallets', 'UPDATE');

  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [wallets, setWallets] = useState<AdminWallet[] | null>(null);
  const [selected, setSelected] = useState<AdminWallet | null>(null);
  const [txs, setTxs] = useState<AdminWalletTx[] | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    listAdminWallets(submittedSearch)
      .then((data) => {
        if (!cancelled) setWallets(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Không tải được ví');
      });
    return () => {
      cancelled = true;
    };
  }, [canRead, submittedSearch, reloadKey]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    listAdminWalletTransactions(selected.user.id)
      .then((data) => {
        if (!cancelled) setTxs(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Không tải được sổ cái');
      });
    return () => {
      cancelled = true;
    };
  }, [selected, reloadKey]);

  function pick(w: AdminWallet) {
    setSelected(w);
    setTxs(null);
    setDelta('');
    setReason('');
    setError(null);
    setInfo(null);
  }

  const deltaNum = Number(delta);
  const deltaValid = Number.isInteger(deltaNum) && deltaNum !== 0;
  const reasonValid = reason.trim().length >= 5;

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !deltaValid || !reasonValid) return;
    setBusy(true);
    setError(null);
    try {
      await adjustAdminWallet(selected.user.id, deltaNum, reason.trim());
      setInfo(
        `Đã ${deltaNum > 0 ? 'cộng' : 'trừ'} ${formatKpoint(Math.abs(deltaNum))} cho ${selected.user.email}.`,
      );
      setDelta('');
      setReason('');
      setReloadKey((k) => k + 1);
      setSelected(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không điều chỉnh được số dư');
    } finally {
      setBusy(false);
    }
  }

  if (!userLoading && !perms.loading && !canRead) {
    return (
      <CmsShell active="/cms/wallets">
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
    <CmsShell active="/cms/wallets">
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">Ví & sổ cái người dùng</h3>
          <p className="mt-1 text-xs text-slate-500">
            Tra cứu số dư theo email. Điều chỉnh số dư phải có lý do và được ghi vào sổ cái.
          </p>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmittedSearch(search);
          }}
        >
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo email..."
            className="max-w-sm"
          />
          <Button variant="blue" size="sm" type="submit">
            Tìm
          </Button>
        </form>

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

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <Table>
            <Thead>
              <Th>Tài khoản</Th>
              <Th>Số dư</Th>
              <Th>Đang ký quỹ/khoá</Th>
              <Th>Khả dụng</Th>
              <Th>Trạng thái</Th>
              <Th>Thao tác</Th>
            </Thead>
            <Tbody>
              {wallets === null ? (
                <tr>
                  <Td colSpan={6} className="py-6 text-center text-slate-400">
                    Đang tải...
                  </Td>
                </tr>
              ) : wallets.length === 0 ? (
                <tr>
                  <Td colSpan={6} className="py-6 text-center text-slate-400">
                    Không tìm thấy ví nào.
                  </Td>
                </tr>
              ) : (
                wallets.map((w) => (
                  <tr
                    key={w.id}
                    className={`hover:bg-slate-50 ${selected?.id === w.id ? 'bg-amber-50/60' : ''}`}
                  >
                    <Td className="font-bold text-slate-800">{w.user.email}</Td>
                    <Td className="font-mono text-xs">{formatKpoint(Number(w.balanceKpoint))}</Td>
                    <Td className="font-mono text-xs">{formatKpoint(Number(w.reservedKpoint))}</Td>
                    <Td className="font-mono text-xs font-bold">
                      {formatKpoint(Number(w.availableKpoint))}
                    </Td>
                    <Td>
                      {w.user.disabledAt ? (
                        <Badge tone="critical">Đã khoá</Badge>
                      ) : (
                        <Badge tone="positive">Hoạt động</Badge>
                      )}
                    </Td>
                    <Td>
                      <Button variant="outline" size="sm" onClick={() => pick(w)}>
                        Xem sổ cái
                      </Button>
                    </Td>
                  </tr>
                ))
              )}
            </Tbody>
          </Table>
        </div>

        {selected && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold text-slate-700">Điều chỉnh số dư</p>
              <p className="text-[11px] text-slate-500">{selected.user.email}</p>
              {canAdjust ? (
                <form onSubmit={handleAdjust} className="space-y-3">
                  <Field label="Số KPoint (dương = cộng, âm = trừ)">
                    <Input
                      type="number"
                      value={delta}
                      onChange={(e) => setDelta(e.target.value)}
                      placeholder="vd. 5000 hoặc -2000"
                    />
                  </Field>
                  <Field label="Lý do (bắt buộc, tối thiểu 5 ký tự)">
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={300}
                      placeholder="vd. Bồi hoàn lỗi ghi nhận giao dịch"
                    />
                  </Field>
                  <Button
                    variant="gold"
                    size="sm"
                    type="submit"
                    disabled={busy || !deltaValid || !reasonValid}
                  >
                    {busy ? 'Đang ghi...' : 'Ghi điều chỉnh'}
                  </Button>
                </form>
              ) : (
                <p className="text-xs text-slate-400">Bạn chỉ có quyền xem.</p>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-2 text-xs font-bold text-slate-700">
                Sổ cái (100 giao dịch gần nhất)
              </div>
              <Table>
                <Thead>
                  <Th>Thời gian</Th>
                  <Th>Loại</Th>
                  <Th>Số dư</Th>
                  <Th>Ghi chú</Th>
                </Thead>
                <Tbody>
                  {txs === null ? (
                    <tr>
                      <Td colSpan={4} className="py-6 text-center text-slate-400">
                        Đang tải...
                      </Td>
                    </tr>
                  ) : txs.length === 0 ? (
                    <tr>
                      <Td colSpan={4} className="py-6 text-center text-slate-400">
                        Chưa có giao dịch.
                      </Td>
                    </tr>
                  ) : (
                    txs.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <Td className="whitespace-nowrap font-mono text-[11px] text-slate-500">
                          {new Date(t.createdAt).toLocaleString('vi-VN')}
                        </Td>
                        <Td className="text-xs">{t.type}</Td>
                        <Td className="font-mono text-xs">
                          {Number(t.balanceDeltaKpoint) !== 0
                            ? formatKpoint(Number(t.balanceDeltaKpoint))
                            : formatKpoint(Number(t.reservedDeltaKpoint)) + ' (ký quỹ)'}
                        </Td>
                        <Td className="text-xs text-slate-600">{t.note ?? '—'}</Td>
                      </tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </CmsShell>
  );
}
