import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export function PublicNav() {
  return (
    <header className="border-line bg-paper-raised border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/">
          <Logo size={28} />
        </Link>
        <nav className="text-ink flex items-center gap-6 text-sm">
          <Link href="/" className="hover:text-navy">
            Khám phá Campaign
          </Link>
          <Link href="/a/dashboard" className="hover:text-navy">
            Dành cho Doanh nghiệp
          </Link>
          <Link
            href="/login"
            className="border-navy text-navy hover:bg-navy border px-3 py-1.5 hover:text-white"
          >
            Đăng nhập
          </Link>
        </nav>
      </div>
    </header>
  );
}
