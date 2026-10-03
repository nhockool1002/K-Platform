'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, KpiCard } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PLATFORM_BADGE, PLATFORM_LABEL } from '@/lib/mock-data';
import { formatKpoint } from '@/lib/format';
import { useWallet } from '@/lib/use-wallet';
import { ApiError } from '@/lib/auth-client';
import { listMySubmissions, type Submission } from '@/lib/submissions-client';

export default function PublisherDashboard() {
  const { wallet, loading: walletLoading } = useWallet();
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMySubmissions()
      .then(setSubmissions)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Không tải được nhiệm vụ của bạn');
        setSubmissions([]);
      });
  }, []);

  const needsProof = (submissions ?? []).filter((s) => s.status === 'INVITED');
  const inFlight = (submissions ?? []).filter(
    (s) => s.status === 'INVITED' || s.status === 'PENDING',
  );
  const approved = (submissions ?? []).filter((s) => s.status === 'APPROVED');
  const totalEarned = approved.reduce((sum, s) => sum + Number(s.campaign?.rewardPerSlot ?? 0), 0);

  return (
    <AppShell role="publisher" active="/b/dashboard">
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Tài Khoản Người Dùng"
          description="Quản lý nhiệm vụ trải nghiệm, nộp bằng chứng review và theo dõi tiền thưởng KPoint."
          actions={
            <>
              <Link href="/">
                <Button variant="gold">
                  <Search className="h-4 w-4" />
                  Khám Phá Chiến Dịch Mới
                </Button>
              </Link>
              <Link href="/wallet">
                <Button variant="blue">Rút KPoint Về Ngân Hàng</Button>
              </Link>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Số Dư Khả Dụng Trong Ví"
            value={walletLoading || !wallet ? '···' : formatKpoint(Number(wallet.availableKpoint))}
            valueClassName="text-emerald-600"
            hint="Đủ điều kiện rút về ATM nội địa"
          />
          <KpiCard
            label="Điểm Uy Tín (Trust Score)"
            value="92 / 100"
            valueClassName="text-brand-blue"
            hint="Hạng: Cao Cấp (Được ưu tiên slot)"
            hintClassName="font-bold text-emerald-600"
          />
          <KpiCard
            label="Nhiệm Vụ Đang Làm"
            value={submissions === null ? '···' : `${inFlight.length} Tasks`}
            valueClassName="text-amber-600"
            hint="Invite chưa nộp Proof + Proof chờ duyệt"
          />
          <KpiCard
            label="Tổng KPoint Đã Nhận"
            value={submissions === null ? '···' : formatKpoint(totalEarned)}
            hint={`${approved.length} nhiệm vụ hoàn thành`}
          />
        </div>

        <Card rounded="3xl" className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase">
              Nhiệm Vụ Cần Nộp Bài (In Progress)
            </h3>
            <span className="hidden text-xs font-bold text-brand-blue sm:inline">
              1 slot / campaign theo SRS
            </span>
          </div>

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}

          {submissions === null ? (
            <p className="py-6 text-center text-xs text-slate-500">Đang tải...</p>
          ) : needsProof.length === 0 ? (
            <EmptyState
              title="Không có nhiệm vụ nào cần nộp bài"
              body="Khi được Tài khoản Dịch vụ Invite vào một Campaign, nhiệm vụ nộp Proof sẽ hiện ở đây."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {needsProof.map((s) => (
                <div
                  key={s.id}
                  className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-brand-blue">
                      #{s.campaignId.slice(0, 8)}: {s.campaign?.title ?? ''}
                    </span>
                    {s.campaign && (
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${PLATFORM_BADGE[s.campaign.platform]}`}
                      >
                        {PLATFORM_LABEL[s.campaign.platform]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    {s.campaign?.location ?? 'Nộp ảnh/video bằng chứng để nhận thưởng.'}
                  </p>
                  <div className="flex items-center justify-between border-t border-slate-200/80 pt-2">
                    <span className="font-mono text-xs font-bold text-emerald-600">
                      Thưởng: +{formatKpoint(Number(s.campaign?.rewardPerSlot ?? 0))}
                    </span>
                    <Link href={`/b/tasks/${s.id}`}>
                      <Button variant="gold" size="sm">
                        Nộp Proof Ngay
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
