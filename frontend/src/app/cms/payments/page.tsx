import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { mockBmcTopups } from '@/lib/mock-data';
import { formatKpoint } from '@/lib/format';

export default function CmsPaymentsPage() {
  const first = mockBmcTopups[0];

  return (
    <AppShell role="admin" active="/cms/payments">
      <PageHeader
        title="Duyệt nạp tiền quốc tế"
        description="Đối soát Transaction ID với tài khoản Buy Me a Coffee thực tế trước khi phê duyệt."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-3">
          {mockBmcTopups.map((tp) => (
            <div
              key={tp.id}
              className="border-line bg-paper-raised flex items-center justify-between border p-4"
            >
              <div>
                <p className="text-ink font-medium">{tp.user}</p>
                <p className="text-ink-muted font-ledger text-xs">
                  {tp.id} · {tp.txnId} · ${tp.amountUsd}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-ledger text-navy text-sm font-semibold">
                  {formatKpoint(tp.kpointAmount)}
                </span>
                <StatusPill tone="warning">Chờ duyệt</StatusPill>
              </div>
            </div>
          ))}
        </div>

        <aside className="border-line bg-paper-raised h-fit border p-5">
          <p className="text-ink-muted text-xs">Đang xem</p>
          <p className="text-ink mt-1 font-medium">{first.user}</p>
          <div className="border-line mt-3 border border-dashed p-3">
            <div className="bg-paper aspect-[4/3] w-full" />
            <p className="text-ink-muted mt-2 text-xs">Ảnh hóa đơn Buy Me a Coffee</p>
          </div>
          <dl className="font-ledger mt-4 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted font-ui">Transaction ID</dt>
              <dd className="text-ink">{first.txnId}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted font-ui">Số tiền USD</dt>
              <dd className="text-ink">${first.amountUsd}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted font-ui">Quy đổi KPoint</dt>
              <dd className="text-ink">{formatKpoint(first.kpointAmount)}</dd>
            </div>
          </dl>
          <div className="mt-5 flex gap-2">
            <Button className="flex-1">Phê duyệt</Button>
            <button className="border-ledger-red text-ledger-red flex-1 border px-4 py-2 text-sm font-medium">
              Từ chối
            </button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
