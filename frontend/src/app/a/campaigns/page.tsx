import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { CampaignTicketCard } from '@/components/ui/CampaignTicketCard';
import { mockCampaigns } from '@/lib/mock-data';

export default function CampaignListPage() {
  return (
    <AppShell role="advertiser" active="/a/campaigns">
      <div className="space-y-6">
        <PageHeader
          title="Campaign Của Tôi"
          description="Chiến dịch đã Archive vẫn xem lại được, nhưng không thể xóa khỏi hệ thống (ràng buộc SRS)."
          actions={
            <Link href="/a/campaigns/new">
              <Button variant="gold">
                <Plus className="h-4 w-4" />
                Tạo Campaign Mới
              </Button>
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {mockCampaigns.map((c) => (
            <CampaignTicketCard
              key={c.id}
              {...c}
              href={`/a/campaigns/${c.id}`}
              ctaLabel="Quản lý"
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
