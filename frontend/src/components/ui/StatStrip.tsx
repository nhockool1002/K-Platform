interface Stat {
  label: string;
  value: string;
  hint?: string;
}

// Dải thống kê ngang có đường kẻ dọc phân cách — tránh lưới "card" giống hệt nhau.
export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <dl className="border-line bg-paper-raised grid grid-cols-2 border sm:grid-cols-4">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={`px-5 py-4 ${i > 0 ? 'border-line border-t sm:border-t-0 sm:border-l' : ''}`}
        >
          <dt className="text-ink-muted text-xs">{stat.label}</dt>
          <dd className="font-ledger text-ink mt-1 text-xl font-medium">{stat.value}</dd>
          {stat.hint && <p className="text-ink-muted mt-0.5 text-xs">{stat.hint}</p>}
        </div>
      ))}
    </dl>
  );
}
