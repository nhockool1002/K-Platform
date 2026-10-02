import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { CampaignTicketCard } from '@/components/ui/CampaignTicketCard';
import { mockCampaigns } from '@/lib/mock-data';

export default function CampaignListPage() {
  return (
    <AppShell role="advertiser" active="/a/campaigns">
      <PageHeader
        title="Campaign của tôi"
        description="Chiến dịch đã Archive vẫn xem lại được, nhưng không thể xóa khỏi hệ thống."
        actions={
          <Link href="/a/campaigns/new">
            <Button>Tạo Campaign mới</Button>
          </Link>
        }
      />
      <div className="flex flex-col gap-3">
        {mockCampaigns.map((c) => (
          <CampaignTicketCard key={c.id} {...c} href={`/a/campaigns/${c.id}`} />
        ))}
      </div>
    </AppShell>
  );
}
