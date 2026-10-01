import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  return (
    <div className="flex min-h-full">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-[480px] lg:shrink-0">
        <Link href="/" className="mb-10">
          <Logo size={28} />
        </Link>

        <h1 className="font-display text-ink text-2xl font-medium">Đăng nhập</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Chưa có tài khoản?{' '}
          <Link href="/login" className="text-navy font-medium">
            Đăng ký miễn phí
          </Link>
        </p>

        <form className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-ink font-medium">Email</span>
            <input
              type="email"
              placeholder="ban@congty.com"
              className="border-line text-ink placeholder:text-ink-muted border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-navy"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink font-medium">Mật khẩu</span>
              <Link href="/login" className="text-navy text-xs">
                Quên mật khẩu?
              </Link>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              className="border-line text-ink border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-navy"
            />
          </label>

          <Button type="submit" className="mt-2 w-full">
            Đăng nhập
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs">
          <span className="border-line h-px flex-1 border-t" />
          <span className="text-ink-muted">hoặc tiếp tục với</span>
          <span className="border-line h-px flex-1 border-t" />
        </div>

        <div className="flex flex-col gap-2">
          <button className="border-line text-ink hover:bg-paper border px-4 py-2 text-sm font-medium">
            Google
          </button>
          <button className="border-line text-ink hover:bg-paper border px-4 py-2 text-sm font-medium">
            Facebook
          </button>
        </div>
      </div>

      {/* Mảng bên phải: gắn login với bằng chứng đã xác thực thật — không phải minh họa trang trí */}
      <div className="bg-navy-dark relative hidden flex-1 items-center justify-center overflow-hidden lg:flex">
        <div className="relative w-72 -rotate-2 border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
          <div className="aspect-[4/3] w-full bg-white/10" />
          <div className="absolute top-3 right-3 border border-white/40 px-2 py-0.5 text-[10px] tracking-wide text-white/90">
            UID-7F21 · CP-101
          </div>
          <p className="mt-3 text-sm text-white/90">Review quán cà phê Lữ — chi nhánh Q.1</p>
          <p className="font-ledger mt-1 text-xs text-white/60">
            Proof đã được đóng dấu định danh người gửi &amp; chiến dịch
          </p>
        </div>
      </div>
    </div>
  );
}
