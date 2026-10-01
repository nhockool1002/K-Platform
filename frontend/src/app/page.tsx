import { PublicNav } from '@/components/layout/PublicNav';
import { CampaignTicketCard } from '@/components/ui/CampaignTicketCard';
import { mockCampaigns } from '@/lib/mock-data';

const PLATFORMS = ['Tất cả nền tảng', 'Google Maps', 'Facebook'];

export default function Home() {
  const openCampaigns = mockCampaigns.filter((c) => c.status === 'active');

  return (
    <div className="flex flex-1 flex-col">
      <PublicNav />

      <section className="border-line border-b">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h1 className="font-display text-ink max-w-2xl text-4xl leading-tight font-medium">
            Đi trải nghiệm thật, viết review thật, đổi lấy KPoint thật.
          </h1>
          <p className="text-ink-muted mt-4 max-w-xl text-base">
            K-Platform kết nối doanh nghiệp cần phản hồi xác thực với những người đã thật sự ghé
            thăm, dùng thử, và sẵn sàng kể lại trải nghiệm của mình.
          </p>

          {/* Khối tìm kiếm thật — "hero" là công cụ tìm Campaign, không phải minh họa trang trí */}
          <form className="border-line bg-paper-raised mt-8 flex max-w-xl flex-col gap-3 border p-3 sm:flex-row">
            <input
              type="text"
              placeholder="Tìm theo tên địa điểm, thương hiệu..."
              className="text-ink placeholder:text-ink-muted flex-1 bg-transparent px-2 py-2 text-sm outline-none"
            />
            <select className="border-line text-ink border bg-transparent px-2 py-2 text-sm sm:border-y-0 sm:border-r-0 sm:border-l">
              {PLATFORMS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-navy hover:bg-navy-dark px-5 py-2 text-sm font-medium text-white"
            >
              Tìm Campaign
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="font-display text-ink text-xl font-medium">Campaign đang mở</h2>
          <p className="text-ink-muted text-sm">{openCampaigns.length} chiến dịch</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {openCampaigns.map((c) => (
            <CampaignTicketCard key={c.id} {...c} href="/login" />
          ))}
        </div>
      </section>

      <footer className="border-line text-ink-muted border-t px-6 py-6 text-center text-xs">
        © 2026 K-Platform
      </footer>
    </div>
  );
}
