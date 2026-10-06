'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/Card';
import { formatKpoint } from '@/lib/format';
import { PLATFORM_LABEL } from '@/lib/mock-data';
import { ApiError } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePermissions } from '@/lib/use-permissions';
import { getKpiOverview, type KpiOverview } from '@/lib/reports-client';

export default function CmsOverviewPage() {
  const { loading: userLoading } = useCurrentUser();
  const perms = usePermissions();
  const permsLoading = perms.loading;
  const isAdmin = perms.can('dashboard_overview', 'READ');
  const canView = isAdmin;

  const [data, setData] = useState<KpiOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;

    getKpiOverview()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Không tải được số liệu tổng quan');
      });

    return () => {
      cancelled = true;
    };
  }, [canView]);

  if (!userLoading && !permsLoading && !canView) {
    return (
      <CmsShell active="/cms/overview">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-bold text-slate-800">Không đủ quyền truy cập</p>
          <p className="text-xs text-slate-500">Chỉ Moderator, Admin hoặc Root Admin được xem.</p>
        </div>
      </CmsShell>
    );
  }

  return (
    <CmsShell active="/cms/overview">
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">
            SCR-09: Thống Kê Tổng Quan &amp; Sức Khỏe Nền Tảng
          </h3>
          <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-600">
            System: Healthy
          </span>
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
                label="KPoint Lưu Thông"
                value={formatKpoint(Number(data.circulatingKpoint))}
                hint="Tổng số dư trong ví người dùng"
              />
              <KpiCard
                label="Quỹ Ký Quỹ Đang Khóa"
                value={formatKpoint(Number(data.totalReservedKpoint))}
                valueClassName="text-brand-blue"
                hint="Toàn hệ thống, snapshot hiện tại"
              />
              <KpiCard
                label="Review Hôm Nay"
                value={`${data.reviewsToday} reviews`}
                hintClassName="text-emerald-600"
                hint="Số Proof đã nộp trong ngày"
              />
              <KpiCard
                label="Doanh Thu Phí Tạo Camp"
                value={formatKpoint(Number(data.campaignFeeRevenueThisMonth))}
                valueClassName="text-purple-700"
                hint="Tháng này, phí cố định 50k/campaign"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 pt-2 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase">
                  Chiến Dịch Đang Hoạt Động Gần Đây
                </h4>
                {data.recentActiveCampaigns.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-slate-400">
                    Chưa có Campaign nào đang hoạt động.
                  </p>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    {data.recentActiveCampaigns.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-lg bg-slate-50 p-2"
                      >
                        <div>
                          <span className="block font-bold text-slate-800">{c.title}</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {PLATFORM_LABEL[c.platform]} • {c.slotsFilled}/{c.totalSlots} slots •
                            Drip-feed {c.dripFeedLimit}/ngày
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-700">ACTIVE</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase">
                  Cảnh Báo Yêu Cầu Xử Lý Nhanh
                </h4>
                <div className="space-y-2.5 text-xs">
                  <Link
                    href="/cms/withdrawals"
                    className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-2 transition hover:bg-amber-100"
                  >
                    <span className="font-medium text-amber-900">
                      {data.pendingWithdrawals} Yêu cầu Rút Tiền đang chờ duyệt
                    </span>
                    <Badge tone="gold">Duyệt ngay</Badge>
                  </Link>
                  <Link
                    href="/cms/disputes"
                    className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 p-2 transition hover:bg-purple-100"
                  >
                    <span className="font-medium text-purple-900">
                      {data.pendingDisputes} Hồ sơ Khiếu nại chờ xử lý
                    </span>
                    <Badge tone="purple">Xử lý</Badge>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </CmsShell>
  );
}
