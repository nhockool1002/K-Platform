import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';

export default function Home() {
  return (
    <div className="bg-brand-bg-light flex flex-1 flex-col items-center justify-center dark:bg-black">
      <main className="flex w-full max-w-xl flex-col items-center gap-6 rounded-xl bg-white p-10 text-center shadow-sm dark:bg-zinc-900">
        <Logo size={56} />
        <div>
          <h1 className="text-brand-navy text-2xl font-bold tracking-tight">K-Point Platform</h1>
          <p className="text-muted mt-2 text-sm">
            Nền tảng kết nối Khảo sát &amp; Trải nghiệm Thực tế — foundation scaffold (Phase 0).
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="primary">Bên A — Advertiser</Button>
          <Button variant="secondary">Bên B — Publisher</Button>
        </div>
      </main>
    </div>
  );
}
