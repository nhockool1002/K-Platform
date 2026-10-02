import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { LedgerTable, LedgerRow, LedgerCell } from '@/components/ui/LedgerTable';
import { mockTransactions, mockWallet } from '@/lib/mock-data';
import { formatKpoint } from '@/lib/format';

export default function WalletPage() {
  const available = mockWallet.balanceKpoint - mockWallet.reservedKpoint;

  return (
    <AppShell role="advertiser" active="/wallet">
      <PageHeader
        title="Ví KPoint"
        description="1 KPoint = 1 VNĐ. Lịch sử tách theo chế độ Bên A / Bên B đang hoạt động."
      />

      <div className="border-line bg-paper-raised grid grid-cols-1 border sm:grid-cols-3">
        <div className="px-5 py-5">
          <p className="text-ink-muted text-xs">Khả dụng</p>
          <p className="font-ledger text-navy mt-1 text-2xl font-semibold">
            {formatKpoint(available)}
          </p>
        </div>
        <div className="border-line border-t px-5 py-5 sm:border-t-0 sm:border-l">
          <p className="text-ink-muted text-xs">Đang bị khóa (reserved)</p>
          <p className="font-ledger text-ink mt-1 text-2xl font-semibold">
            {formatKpoint(mockWallet.reservedKpoint)}
          </p>
        </div>
        <div className="border-line flex flex-col justify-center gap-2 border-t px-5 py-5 sm:border-t-0 sm:border-l">
          <Button>Nạp SePay (Trong nước)</Button>
          <button className="border-navy text-navy border px-4 py-2 text-sm font-medium">
            Nạp Buy Me a Coffee (Quốc tế)
          </button>
          <button className="text-ink-muted hover:text-navy text-sm">Rút về ngân hàng →</button>
        </div>
      </div>

      <h2 className="font-display text-ink mt-10 mb-3 text-lg font-medium">Lịch sử giao dịch</h2>
      <LedgerTable columns={['Giao dịch', 'Ngày', 'Số tiền']}>
        {mockTransactions.map((tx) => (
          <LedgerRow key={tx.id}>
            <LedgerCell>
              <p className="text-ink">{tx.label}</p>
              <p className="text-ink-muted text-xs">{tx.id}</p>
            </LedgerCell>
            <LedgerCell className="text-ink-muted">{tx.date}</LedgerCell>
            <LedgerCell
              className={`font-ledger text-right font-medium ${
                tx.direction === 'in' ? 'text-ledger-green' : 'text-ledger-red'
              }`}
            >
              {tx.direction === 'in' ? '+' : ''}
              {formatKpoint(tx.amount)}
            </LedgerCell>
          </LedgerRow>
        ))}
      </LedgerTable>
    </AppShell>
  );
}
