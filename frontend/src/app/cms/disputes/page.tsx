import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { mockDisputes } from '@/lib/mock-data';
import { formatKpoint } from '@/lib/format';

const STATUS_TONE = {
  open: 'critical',
  recommended: 'warning',
  resolved: 'positive',
} as const;

const STATUS_LABEL = {
  open: 'Mới mở',
  recommended: 'Mod đã đề xuất',
  resolved: 'Đã phán quyết',
} as const;

export default function DisputeCenterPage() {
  const current = mockDisputes[0];

  return (
    <AppShell role="admin" active="/cms/disputes">
      <PageHeader
        title="Trung tâm tranh chấp"
        description="Moderator chỉ được đề xuất Pend Approval/Pend Reject — Admin chốt phán quyết cuối cùng."
      />

      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-2">
          {mockDisputes.map((d) => (
            <button
              key={d.id}
              className={`border-line flex flex-col gap-1 border p-3 text-left ${
                d.id === current.id ? 'bg-paper-raised border-navy' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-ink text-sm font-medium">{d.id}</span>
                <StatusPill tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</StatusPill>
              </div>
              <p className="text-ink-muted truncate text-xs">{d.campaign}</p>
            </button>
          ))}
        </div>

        <div className="border-line border-t pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-ink-muted text-xs">
                {current.id} · Submission {current.submission}
              </p>
              <h2 className="font-display text-ink mt-1 text-lg font-medium">{current.campaign}</h2>
            </div>
            <span className="font-ledger text-navy text-lg font-semibold">
              {formatKpoint(current.amount)}
            </span>
          </div>
          <p className="text-ink mt-4 text-sm">{current.reason}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="border-line border p-3">
              <p className="text-ink-muted text-xs">Bằng chứng Bên B</p>
              <div className="bg-paper mt-2 aspect-video w-full" />
            </div>
            <div className="border-line border p-3">
              <p className="text-ink-muted text-xs">Lý do từ chối của Bên A</p>
              <p className="text-ink mt-2 text-sm">
                &ldquo;Ảnh mờ, không thấy biển hiệu địa điểm.&rdquo;
              </p>
            </div>
          </div>

          <div className="border-line mt-6 border-t pt-6">
            <p className="text-ink-muted mb-3 text-xs">Phán quyết cuối cùng (Admin)</p>
            <div className="flex gap-2">
              <Button>Approve — trả KPoint cho Bên B</Button>
              <button className="border-ledger-red text-ledger-red border px-4 py-2 text-sm font-medium">
                Reject — hoàn KPoint cho Bên A
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
