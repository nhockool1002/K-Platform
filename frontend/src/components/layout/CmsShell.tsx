'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Banknote,
  ChevronDown,
  Coffee,
  ExternalLink,
  History,
  Scale,
  Settings,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { useCurrentUser } from '@/lib/use-current-user';
import { logout } from '@/lib/auth-client';
import { mockBmcTopups, mockDisputes } from '@/lib/mock-data';

interface NavLeaf {
  href: string;
  label: string;
  icon: typeof BarChart3;
  iconClassName?: string;
  badge?: number;
}

interface NavGroup {
  label: string;
  icon: typeof BarChart3;
  iconClassName?: string;
  children: Omit<NavLeaf, 'icon' | 'iconClassName'>[];
}

const NAV: (NavLeaf | NavGroup)[] = [
  { href: '/cms/overview', label: 'SCR-09: Tổng Quan KPI', icon: BarChart3 },
  {
    href: '/cms/reports',
    label: 'Thống Kê Doanh Thu',
    icon: TrendingUp,
    iconClassName: 'text-emerald-600',
  },
  {
    href: '/cms/payments',
    label: 'SCR-10: Duyệt BMC',
    icon: Coffee,
    iconClassName: 'text-brand-gold',
    badge: mockBmcTopups.length,
  },
  {
    href: '/cms/disputes',
    label: 'SCR-11: Dispute Center',
    icon: Scale,
    iconClassName: 'text-purple-600',
    badge: mockDisputes.filter((d) => d.status === 'open').length,
  },
  {
    href: '/cms/rbac',
    label: 'SCR-12: Phân Quyền RBAC',
    icon: ShieldAlert,
    iconClassName: 'text-rose-500',
  },
  {
    href: '/cms/audit-logs',
    label: 'SCR-13: Nhật Ký Audit Logs',
    icon: History,
    iconClassName: 'text-slate-500',
  },
  {
    href: '/cms/withdrawals',
    label: 'Yêu Cầu Rút Tiền',
    icon: Banknote,
    iconClassName: 'text-emerald-600',
  },
  {
    label: 'Cài Đặt',
    icon: Settings,
    iconClassName: 'text-slate-500',
    children: [
      { href: '/cms/settings/sepay', label: 'Cài đặt SePay' },
      { href: '/cms/settings/activation-fee', label: 'Cài đặt phí kích hoạt' },
    ],
  },
];

function isGroup(item: NavLeaf | NavGroup): item is NavGroup {
  return 'children' in item;
}

export function CmsShell({ active, children }: { active: string; children: ReactNode }) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [openGroup, setOpenGroup] = useState<string | null>(
    () =>
      NAV.find((item) => isGroup(item) && item.children.some((c) => c.href === active))?.label ??
      null,
  );

  function handleExit() {
    logout();
    router.push('/');
  }

  return (
    <div className="flex min-h-full flex-col bg-slate-100">
      <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gold font-mono font-bold text-slate-950">
            CMS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold tracking-tight">
                K-PLATFORM MANAGEMENT SYSTEM
              </span>
              <span className="rounded border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                Root & Mod Area
              </span>
            </div>
            <p className="hidden text-[11px] text-slate-400 sm:block">
              SCR-09 (Overview), SCR-10 (BMC), SCR-11 (Dispute), SCR-12 (RBAC), SCR-13 (Audit Logs)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="hidden font-mono text-slate-400 sm:inline">
            Actor: <strong className="text-amber-400">{user?.email ?? '···'}</strong>
          </span>
          <button
            onClick={handleExit}
            className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-200 transition hover:bg-slate-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Về Client</span>
          </button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-6 md:flex-row">
        <aside className="h-fit w-full shrink-0 space-y-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:w-64">
          <div className="px-3 py-1 font-mono text-[10px] font-bold text-slate-400 uppercase">
            Phân Hệ Nghiệp Vụ CMS
          </div>
          {NAV.map((item) => {
            if (isGroup(item)) {
              const Icon = item.icon;
              const isOpen = openGroup === item.label;
              const hasActiveChild = item.children.some((c) => c.href === active);
              return (
                <div key={item.label}>
                  <button
                    onClick={() => setOpenGroup(isOpen ? null : item.label)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      hasActiveChild && !isOpen
                        ? 'bg-blue-50 text-brand-blue'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${item.iconClassName ?? ''}`} />
                      <span>{item.label}</span>
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="mt-1 ml-3 space-y-1 border-l border-slate-200 pl-3">
                      {item.children.map((child) => {
                        const isActive = child.href === active;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`block rounded-xl px-3 py-2 text-xs font-bold transition ${
                              isActive
                                ? 'bg-brand-blue text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = item.href === active;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  isActive
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon
                    className={`h-4 w-4 ${isActive ? 'text-white' : (item.iconClassName ?? '')}`}
                  />
                  <span>{item.label}</span>
                </span>
                {!!item.badge && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {children}
        </main>
      </div>
    </div>
  );
}
