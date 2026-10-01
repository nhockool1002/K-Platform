import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { formatKpoint } from '@/lib/format';
import { mockWallet } from '@/lib/mock-data';

export type AppRole = 'advertiser' | 'publisher' | 'admin';

interface NavItem {
  label: string;
  href: string;
}

const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  advertiser: [
    { label: 'Dashboard', href: '/a/dashboard' },
    { label: 'Campaign của tôi', href: '/a/campaigns' },
    { label: 'Ví KPoint', href: '/wallet' },
  ],
  publisher: [
    { label: 'Dashboard', href: '/b/dashboard' },
    { label: 'Tìm Campaign', href: '/' },
    { label: 'Ví KPoint', href: '/wallet' },
  ],
  admin: [
    { label: 'Tổng quan', href: '/cms/overview' },
    { label: 'Duyệt nạp quốc tế', href: '/cms/payments' },
    { label: 'Trung tâm tranh chấp', href: '/cms/disputes' },
    { label: 'Phân quyền & Root', href: '/cms/rbac' },
    { label: 'Audit Logs', href: '/cms/audit-logs' },
  ],
};

const ROLE_LABEL: Record<AppRole, string> = {
  advertiser: 'Bên A — Advertiser',
  publisher: 'Bên B — Publisher',
  admin: 'Quản trị hệ thống',
};

export function AppShell({
  role,
  active,
  children,
}: {
  role: AppRole;
  active: string;
  children: ReactNode;
}) {
  const items = NAV_BY_ROLE[role];

  return (
    <div className="flex min-h-full">
      <aside className="border-line bg-paper-raised hidden w-64 shrink-0 flex-col border-r md:flex">
        <div className="border-line border-b p-5">
          <Logo size={28} />
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {items.map((item) => {
            const isActive = item.href === active;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 text-sm ${
                  isActive ? 'bg-navy font-medium text-white' : 'text-ink hover:bg-paper'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {role !== 'admin' && (
          <div className="border-line border-t p-3">
            <Link
              href={role === 'advertiser' ? '/b/dashboard' : '/a/dashboard'}
              className="border-line text-ink-muted hover:text-navy block border px-3 py-2 text-center text-xs"
            >
              Switch Mode → {role === 'advertiser' ? 'Bên B' : 'Bên A'}
            </Link>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-line bg-paper-raised flex items-center justify-between border-b px-4 py-3 md:px-8">
          <div>
            <p className="text-ink-muted text-xs">{ROLE_LABEL[role]}</p>
          </div>
          <div className="flex items-center gap-4">
            {role !== 'admin' && (
              <div className="text-right">
                <p className="text-ink-muted text-xs">Số dư khả dụng</p>
                <p className="font-ledger text-navy text-sm font-semibold">
                  {formatKpoint(mockWallet.balanceKpoint - mockWallet.reservedKpoint)}
                </p>
              </div>
            )}
            <div className="bg-navy flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white">
              {role === 'admin' ? 'AD' : role === 'advertiser' ? 'A' : 'B'}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
