import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[640px] text-left text-xs whitespace-nowrap">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50 font-mono text-[11px] text-slate-600">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({ children, className = '', ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`p-3 font-bold ${className}`} {...props}>
      {children}
    </th>
  );
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function Td({ children, className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`p-3 ${className}`} {...props}>
      {children}
    </td>
  );
}
