import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatStrip } from '@/components/ui/StatStrip';
import { StatusPill } from '@/components/ui/StatusPill';
import { mockMyTasks, mockWallet } from '@/lib/mock-data';
import { formatKpoint } from '@/lib/format';

const STATUS_TONE = {
  awaiting_proof: 'warning',
  pending_review: 'neutral',
  approved: 'positive',
} as const;

const STATUS_LABEL = {
  awaiting_proof: 'Chờ nộp Proof',
  pending_review: 'Chờ duyệt',
  approved: 'Đã duyệt',
} as const;

export default function PublisherDashboard() {
  return (
    <AppShell role="publisher" active="/b/dashboard">
      <PageHeader
        title="Nhiệm vụ của bạn"
        description="Các Campaign bạn đang tham gia và trạng thái nộp Proof."
      />

      <StatStrip
        stats={[
          { label: 'KPoint kiếm được (tháng này)', value: formatKpoint(165_000) },
          { label: 'Số dư ví', value: formatKpoint(mockWallet.balanceKpoint) },
          { label: 'Nhiệm vụ đang làm', value: '2' },
          { label: 'Trust Score', value: '92/100' },
        ]}
      />

      <div className="mt-10">
        <h2 className="font-display text-ink mb-4 text-lg font-medium">Đang tham gia</h2>
        <div className="flex flex-col gap-3">
          {mockMyTasks.map((t) => (
            <Link
              key={t.id}
              href={`/b/tasks/${t.id}`}
              className="border-line bg-paper-raised flex items-center justify-between gap-4 border p-4"
            >
              <div className="min-w-0">
                <p className="text-ink truncate font-medium">{t.campaign}</p>
                <p className="text-ink-muted mt-1 text-xs">
                  {t.id} · {t.deadline}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="font-ledger text-navy text-sm font-semibold">
                  {formatKpoint(t.reward)}
                </span>
                <StatusPill tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</StatusPill>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
