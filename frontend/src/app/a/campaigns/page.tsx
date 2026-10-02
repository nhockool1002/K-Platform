'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { CampaignTicketCard } from '@/components/ui/CampaignTicketCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/lib/auth-client';
import { listMyCampaigns, type Campaign } from '@/lib/campaigns-client';

export default function CampaignListPage() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyCampaigns()
      .then(setCampaigns)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Không tải được danh sách Campaign');
        setCampaigns([]);
      });
  }, []);

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

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        {campaigns === null ? (
          <p className="text-center text-xs text-slate-500">Đang tải...</p>
        ) : campaigns.length === 0 ? (
          <EmptyState
            title="Chưa có Campaign nào"
            body="Tạo Campaign đầu tiên để bắt đầu nhận review thực từ Bên B."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <CampaignTicketCard
                key={c.id}
                id={c.id}
                name={c.title}
                platform={c.platform}
                location={c.location ?? ''}
                slots={c.totalSlots}
                slotsFilled={c.slotsFilled}
                rewardPerSlot={Number(c.rewardPerSlot)}
                dripFeedPerDay={c.dripFeedLimit}
                trustScoreRequired={c.minTrustScore}
                href={`/a/campaigns/${c.id}`}
                ctaLabel="Quản lý"
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
