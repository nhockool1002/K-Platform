import type { ReactNode } from 'react';

interface LedgerTableProps {
  columns: string[];
  children: ReactNode;
}

// Bảng kiểu "sổ cái": kẻ dòng mảnh + chấm tick đầu dòng (xem .ledger-row trong globals.css).
// Dùng cho Lịch sử giao dịch Ví (SCR-08) và Audit Logs (SCR-13) — nơi mô-típ này có ý nghĩa thật.
export function LedgerTable({ columns, children }: LedgerTableProps) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-line border-b">
          {columns.map((col) => (
            <th key={col} className="text-ink-muted px-4 py-2 pl-5 text-xs font-medium">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function LedgerRow({ children }: { children: ReactNode }) {
  return <tr className="ledger-row">{children}</tr>;
}

export function LedgerCell({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 pl-5 ${className}`}>{children}</td>;
}
