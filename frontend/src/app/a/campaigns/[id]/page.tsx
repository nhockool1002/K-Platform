import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { mockApplicants, mockCampaigns } from '@/lib/mock-data';

const STATUS_TONE = {
  pending: 'neutral',
  invited: 'positive',
  rejected: 'critical',
} as const;

const STATUS_LABEL = {
  pending: 'Chờ xét duyệt',
  invited: 'Đã mời',
  rejected: 'Đã từ chối',
} as const;

export default async function ManageCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = mockCampaigns.find((c) => c.id === id) ?? mockCampaigns[0];

  return (
    <AppShell role="advertiser" active="/a/campaigns">
      <PageHeader
        eyebrow={campaign.id}
        title={campaign.name}
        description={`${campaign.slotsFilled}/${campaign.slots} slot đã nhận · ${campaign.platform}`}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="font-display text-ink mb-3 text-base font-medium">Ứng viên nộp Survey</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-line border-b">
                <th className="text-ink-muted px-3 py-2 text-xs font-medium">Người ứng tuyển</th>
                <th className="text-ink-muted px-3 py-2 text-xs font-medium">Trust Score</th>
                <th className="text-ink-muted px-3 py-2 text-xs font-medium">Trạng thái</th>
                <th className="text-ink-muted px-3 py-2 text-xs font-medium" />
              </tr>
            </thead>
            <tbody>
              {mockApplicants.map((a) => (
                <tr key={a.id} className="ledger-row">
                  <td className="px-3 py-3">
                    <p className="text-ink font-medium">{a.name}</p>
                    <p className="text-ink-muted text-xs">{a.id}</p>
                  </td>
                  <td className="font-ledger px-3 py-3">{a.trustScore}</td>
                  <td className="px-3 py-3">
                    <StatusPill tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</StatusPill>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {a.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <button className="text-ledger-green text-xs font-medium">Mời</button>
                        <button className="text-ledger-red text-xs font-medium">Từ chối</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="border-line bg-paper-raised h-fit border p-5">
          <h3 className="font-display text-ink text-sm font-medium">Proof chờ duyệt</h3>
          <div className="border-line mt-3 border border-dashed p-3">
            <div className="bg-paper aspect-video w-full" />
            <p className="text-ink mt-2 text-sm font-medium">Trần Văn Khoa — AP-87</p>
            <p className="text-ink-muted text-xs">Nộp lúc 14:02 · 29/09/2026</p>
            <div className="mt-3 flex gap-2">
              <Button className="flex-1">Duyệt</Button>
              <button className="border-ledger-red text-ledger-red flex-1 border px-4 py-2 text-sm font-medium">
                Từ chối
              </button>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
