import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatStrip } from '@/components/ui/StatStrip';
import { CampaignTicketCard } from '@/components/ui/CampaignTicketCard';
import { Button } from '@/components/ui/Button';
import { mockCampaigns } from '@/lib/mock-data';
import { formatKpoint } from '@/lib/format';

export default function AdvertiserDashboard() {
  const active = mockCampaigns.filter((c) => c.status === 'active');
  const totalSpent = 2_430_000;
  const reviewsCompleted = 86;

  return (
    <AppShell role="advertiser" active="/a/dashboard">
      <PageHeader
        title="Chào buổi sáng, Công ty TNHH Lữ"
        description="Tổng quan các chiến dịch review đang chạy và số liệu gần đây."
        actions={
          <Link href="/a/campaigns/new">
            <Button>Tạo Campaign mới</Button>
          </Link>
        }
      />

      <StatStrip
        stats={[
          { label: 'Campaign đang chạy', value: String(active.length) },
          { label: 'Tổng KPoint đã chi', value: formatKpoint(totalSpent) },
          { label: 'Review hoàn thành', value: String(reviewsCompleted) },
          { label: 'Chờ duyệt Proof', value: '7', hint: 'Cần xử lý trong 48h' },
        ]}
      />

      <div className="mt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-ink text-lg font-medium">Campaign của bạn</h2>
          <Link href="/a/campaigns" className="text-navy text-sm">
            Xem tất cả
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {mockCampaigns.map((c) => (
            <CampaignTicketCard key={c.id} {...c} href={`/a/campaigns/${c.id}`} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
