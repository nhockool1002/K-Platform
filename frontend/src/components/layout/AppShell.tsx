'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, LogOut, Sparkles, Wallet } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { formatKpoint } from '@/lib/format';
import { mockWallet } from '@/lib/mock-data';
import { useCurrentUser } from '@/lib/use-current-user';
import { switchMode, logout, type ActiveMode } from '@/lib/auth-client';

export type AppRole = 'advertiser' | 'publisher';

interface NavItem {
  label: string;
  href: string;
}

const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  advertiser: [
    { label: 'Dashboard', href: '/a/dashboard' },
    { label: 'Campaign của tôi', href: '/a/campaigns' },
  ],
  publisher: [
    { label: 'Dashboard', href: '/b/dashboard' },
    { label: 'Khám phá Campaign', href: '/' },
  ],
};

const DASHBOARD_HREF: Record<ActiveMode, string> = {
  A: '/a/dashboard',
  B: '/b/dashboard',
};

export function AppShell({
  role,
  active,
  children,
}: {
  /** Omit on shared routes (vd. /wallet) — role sẽ được suy ra từ activeMode của user đã đăng nhập. */
  role?: AppRole;
  active: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const activeMode: ActiveMode = role
    ? role === 'advertiser'
      ? 'A'
      : 'B'
    : (user?.activeMode ?? 'A');
  const items = NAV_BY_ROLE[activeMode === 'A' ? 'advertiser' : 'publisher'];

  async function handleSwitchMode(target: ActiveMode) {
    if (target === activeMode) return;
    const newMode = await switchMode(target);
    router.push(DASHBOARD_HREF[newMode]);
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <Link href={DASHBOARD_HREF[activeMode]}>
              <Logo size={28} />
            </Link>
            <nav className="hidden items-center gap-5 text-xs font-semibold text-slate-600 md:flex">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    item.href === active ? 'text-brand-blue' : 'transition hover:text-slate-900'
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center rounded-full border border-slate-200 bg-slate-100 p-1 text-xs shadow-inner"
              title="FN-AUTH-01: Switch Mode 1 click"
            >
              <button
                onClick={() => handleSwitchMode('A')}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-bold transition ${
                  activeMode === 'A'
                    ? 'bg-brand-gold text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bên A</span>
              </button>
              <button
                onClick={() => handleSwitchMode('B')}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-bold transition ${
                  activeMode === 'B'
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bên B</span>
              </button>
            </div>

            <Link
              href="/wallet"
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 transition hover:bg-slate-800"
              title="Ví KPoint"
            >
              <Wallet className="h-3.5 w-3.5 text-brand-gold" />
              <span className="font-mono text-xs font-bold text-white">
                {loading
                  ? '···'
                  : formatKpoint(mockWallet.balanceKpoint - mockWallet.reservedKpoint)}
              </span>
            </Link>

            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-white transition hover:bg-brand-blue-dark"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-slate-50 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
