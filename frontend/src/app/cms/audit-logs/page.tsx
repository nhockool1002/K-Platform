import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { LedgerTable, LedgerRow, LedgerCell } from '@/components/ui/LedgerTable';
import { mockAuditLogs } from '@/lib/mock-data';

const LEVEL_TONE = {
  info: 'neutral',
  warning: 'warning',
  critical: 'critical',
} as const;

export default function AuditLogsPage() {
  return (
    <AppShell role="admin" active="/cms/audit-logs">
      <PageHeader
        title="Audit Logs"
        description="Mọi thao tác CREATE/UPDATE/DELETE/DISPUTE_RESOLVE/MANUAL_TOPUP đều được ghi lại kèm IP & Device Fingerprint."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <select className="border-line text-ink border bg-transparent px-3 py-1.5 text-sm">
          <option>Khoảng thời gian: 7 ngày qua</option>
        </select>
        <select className="border-line text-ink border bg-transparent px-3 py-1.5 text-sm">
          <option>Loại hành động: Tất cả</option>
        </select>
        <select className="border-line text-ink border bg-transparent px-3 py-1.5 text-sm">
          <option>Mức độ: Tất cả</option>
        </select>
      </div>

      <LedgerTable columns={['Thời gian', 'Actor', 'Hành động', 'Tài nguyên', 'Mức độ']}>
        {mockAuditLogs.map((log) => (
          <LedgerRow key={log.id}>
            <LedgerCell className="font-ledger text-ink-muted">{log.time}</LedgerCell>
            <LedgerCell className="text-ink">{log.actor}</LedgerCell>
            <LedgerCell className="font-ledger text-ink">{log.action}</LedgerCell>
            <LedgerCell className="text-ink-muted">{log.resource}</LedgerCell>
            <LedgerCell>
              <StatusPill tone={LEVEL_TONE[log.level]}>{log.level.toUpperCase()}</StatusPill>
            </LedgerCell>
          </LedgerRow>
        ))}
      </LedgerTable>
    </AppShell>
  );
}
