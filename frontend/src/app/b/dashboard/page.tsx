import Link from 'next/link';
import { Search } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, KpiCard } from '@/components/ui/Card';
import { PLATFORM_BADGE, PLATFORM_LABEL, mockMyTasks, mockWallet } from '@/lib/mock-data';
import { formatKpoint } from '@/lib/format';

export default function PublisherDashboard() {
  const inProgress = mockMyTasks.filter((t) => t.status === 'awaiting_proof');
  const totalEarned = 1_820_000;

  return (
    <AppShell role="publisher" active="/b/dashboard">
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Bên B (Publisher)"
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
            value={formatKpoint(mockWallet.balanceKpoint - mockWallet.reservedKpoint)}
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
            value={`${inProgress.length} Tasks`}
            valueClassName="text-amber-600"
            hint="Hạn chót: Còn 24 giờ"
          />
          <KpiCard
            label="Tổng KPoint Đã Nhận"
            value={formatKpoint(totalEarned)}
            hint="24 nhiệm vụ hoàn thành"
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {inProgress.map((t) => (
              <div
                key={t.id}
                className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-brand-blue">
                    {t.campaignId}: {t.campaign}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${PLATFORM_BADGE[t.platform]}`}
                  >
                    {PLATFORM_LABEL[t.platform]}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{t.requirement}</p>
                <div className="flex items-center justify-between border-t border-slate-200/80 pt-2">
                  <span className="font-mono text-xs font-bold text-emerald-600">
                    Thưởng: +{formatKpoint(t.reward)}
                  </span>
                  <Link href={`/b/tasks/${t.id}`}>
                    <Button variant="gold" size="sm">
                      Nộp Proof Ngay
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
