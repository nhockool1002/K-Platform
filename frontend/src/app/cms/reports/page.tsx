'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { KpiCard } from '@/components/ui/Card';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { formatKpoint } from '@/lib/format';
import { ApiError } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import { getReportsOverview, type ReportPeriod, type ReportsOverview } from '@/lib/reports-client';

const PERIOD_TABS: { key: ReportPeriod; label: string }[] = [
  { key: 'day', label: 'Hôm nay' },
  { key: 'month', label: 'Tháng này' },
  { key: 'year', label: 'Năm này' },
  { key: 'all', label: 'Toàn thời gian' },
];

function RankTable({
  title,
  rows,
  extraColumn,
}: {
  title: string;
  rows: { email: string; totalKpoint: string; campaignCount?: number }[];
  extraColumn?: string;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="text-xs font-extrabold text-slate-700 uppercase">{title}</h4>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-[11px] text-slate-400">Chưa có dữ liệu trong kỳ này.</p>
      ) : (
        <Table>
          <Thead>
            <Th className="w-8">#</Th>
            <Th>Tài khoản</Th>
            {extraColumn && <Th className="text-right">{extraColumn}</Th>}
            <Th className="text-right">KPoint</Th>
          </Thead>
          <Tbody>
            {rows.map((r, i) => (
              <tr key={r.email} className="hover:bg-slate-50/70">
                <Td className="font-mono text-slate-400">{i + 1}</Td>
                <Td className="font-bold text-slate-800">{r.email}</Td>
                {extraColumn && <Td className="text-right font-mono">{r.campaignCount}</Td>}
                <Td className="text-right font-mono font-bold text-emerald-600">
                  {formatKpoint(Number(r.totalKpoint))}
                </Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}

export default function CmsReportsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROOT_ADMIN';

  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;
    getReportsOverview(period)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Không tải được số liệu thống kê');
        setData(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, period]);

  if (!userLoading && !isAdmin) {
    return (
      <CmsShell active="/cms/reports">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-bold text-slate-800">Không đủ quyền truy cập</p>
          <p className="text-xs text-slate-500">
            Chỉ Admin hoặc Root Admin được xem Thống kê doanh thu.
          </p>
        </div>
      </CmsShell>
    );
  }

  return (
    <CmsShell active="/cms/reports">
      <div className="space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">Thống Kê Doanh Thu</h3>
          <p className="mt-1 text-xs text-slate-500">
            Doanh thu = Phí tạo Campaign (cố định 50.000 KPoint/Campaign) + Phí kích hoạt Tài khoản
            Dịch vụ đã thu. Ký quỹ đang giữ là số dư khoá (reserved) toàn hệ thống tại thời điểm
            hiện tại, không phụ thuộc bộ lọc kỳ bên dưới.
          </p>
        </div>

        <div className="flex gap-1.5">
          {PERIOD_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setPeriod(t.key)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                period === t.key
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

        {!data ? (
          <p className="py-6 text-center text-xs text-slate-500">Đang tải...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label={`Tổng Doanh Thu (${data.periodLabel})`}
                value={formatKpoint(Number(data.revenue.totalKpoint))}
                valueClassName="text-purple-700"
              />
              <KpiCard
                label="Phí Tạo Campaign"
                value={formatKpoint(Number(data.revenue.campaignCreationFeeKpoint))}
                hint={`${data.revenue.campaignCount} Campaign`}
              />
              <KpiCard
                label="Phí Kích Hoạt Tài Khoản"
                value={formatKpoint(Number(data.revenue.activationFeeKpoint))}
                hint={`${data.revenue.activationCount} lượt kích hoạt`}
              />
              <KpiCard
                label="Ký Quỹ Đang Giữ (Toàn Hệ Thống)"
                value={formatKpoint(Number(data.escrow.totalReservedKpoint))}
                valueClassName="text-brand-blue"
                hint="Snapshot hiện tại"
              />
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase">
                Campaign Đang Ký Quỹ (Active)
              </h4>
              {data.escrow.campaigns.length === 0 ? (
                <p className="py-4 text-center text-[11px] text-slate-400">
                  Không có Campaign nào đang hoạt động.
                </p>
              ) : (
                <Table>
                  <Thead>
                    <Th>Campaign</Th>
                    <Th>Tài khoản Dịch vụ</Th>
                    <Th className="text-right">Slots (Đã duyệt / Tổng)</Th>
                    <Th className="text-right">KPoint Đang Khóa</Th>
                  </Thead>
                  <Tbody>
                    {data.escrow.campaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70">
                        <Td className="font-bold text-slate-800">{c.title}</Td>
                        <Td className="text-slate-600">{c.ownerEmail}</Td>
                        <Td className="text-right font-mono">
                          {c.approvedSlots} / {c.totalSlots}
                        </Td>
                        <Td className="text-right font-mono font-bold text-amber-600">
                          {formatKpoint(Number(c.lockedKpoint))}
                        </Td>
                      </tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <RankTable
                title="Top 10 Tài Khoản Dịch Vụ Ký Quỹ"
                rows={data.topEscrowOwners}
                extraColumn="Campaigns"
              />
              <RankTable title="Top 10 Nạp KPoint Vào Hệ Thống" rows={data.topTopupUsers} />
              <RankTable title="Top 10 Tài Khoản Người Dùng (Top Earning)" rows={data.topEarners} />
            </div>
          </>
        )}
      </div>
    </CmsShell>
  );
}
