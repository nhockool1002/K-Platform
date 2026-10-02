import Link from 'next/link';

const GROUPS: { title: string; screens: { code: string; name: string; href: string }[] }[] = [
  {
    title: 'Public',
    screens: [
      { code: 'SCR-01', name: 'Trang chủ & Public Campaigns', href: '/' },
      { code: 'SCR-02', name: 'Đăng ký / Đăng nhập / OAuth', href: '/login' },
    ],
  },
  {
    title: 'Bên A — Advertiser',
    screens: [
      { code: 'SCR-03', name: 'Dashboard Bên A', href: '/a/dashboard' },
      { code: 'SCR-04', name: 'Tạo Campaign & Survey Filter', href: '/a/campaigns/new' },
      { code: 'SCR-05', name: 'Quản lý Campaign & Appliers', href: '/a/campaigns/CP-101' },
    ],
  },
  {
    title: 'Bên B — Publisher',
    screens: [
      { code: 'SCR-06', name: 'Dashboard Bên B', href: '/b/dashboard' },
      { code: 'SCR-07', name: 'Làm Survey & Submit Proof', href: '/b/tasks/PR-55' },
    ],
  },
  {
    title: 'End-User (chung)',
    screens: [{ code: 'SCR-08', name: 'Quản lý Ví & Nạp/Rút KPoint', href: '/wallet' }],
  },
  {
    title: 'CMS / Admin',
    screens: [
      { code: 'SCR-09', name: 'CMS Overview & Thống kê', href: '/cms/overview' },
      { code: 'SCR-10', name: 'CMS Duyệt Nạp Tiền Quốc Tế', href: '/cms/payments' },
      { code: 'SCR-11', name: 'CMS Tranh chấp (Dispute Center)', href: '/cms/disputes' },
      { code: 'SCR-12', name: 'CMS Quản lý RBAC & Root Admin', href: '/cms/rbac' },
      { code: 'SCR-13', name: 'CMS Quản lý Audit Logs', href: '/cms/audit-logs' },
    ],
  },
];

export default function WireframesIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-navy text-sm font-medium">Wireframe review</p>
      <h1 className="font-display text-ink mt-1 text-2xl font-medium">
        Sơ đồ 13 màn hình K-Platform
      </h1>
      <p className="text-ink-muted mt-2 text-sm">
        Dữ liệu là mock, chưa nối backend. Dùng trang này để duyệt qua toàn bộ sản phẩm trước khi
        vào Phase 1.
      </p>

      <div className="mt-10 flex flex-col gap-8">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="text-ink-muted border-line border-b pb-2 text-xs font-medium">
              {group.title}
            </h2>
            <ul className="mt-2 flex flex-col">
              {group.screens.map((s) => (
                <li key={s.code} className="ledger-row">
                  <Link
                    href={s.href}
                    className="hover:text-navy flex items-center justify-between py-2.5 pl-3 text-sm"
                  >
                    <span className="text-ink">{s.name}</span>
                    <span className="font-ledger text-ink-muted text-xs">{s.code}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
