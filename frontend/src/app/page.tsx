import { MapPin, Search, ShieldCheck } from 'lucide-react';
import { PublicNav } from '@/components/layout/PublicNav';
import { CampaignTicketCard } from '@/components/ui/CampaignTicketCard';
import type { Campaign } from '@/lib/campaigns-client';
import type { PlatformKey } from '@/lib/mock-data';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

const PLATFORM_OPTIONS: { value: PlatformKey | ''; label: string }[] = [
  { value: '', label: 'Tất cả nền tảng' },
  { value: 'GOOGLE_MAPS', label: 'Google Maps' },
  { value: 'FACEBOOK', label: 'Facebook Check-in' },
  { value: 'SHOPEE', label: 'Shopee Mall' },
  { value: 'TIKTOK', label: 'TikTok Video' },
];

async function fetchPublicCampaigns(params: { platform?: string; search?: string }) {
  const qs = new URLSearchParams();
  if (params.platform) qs.set('platform', params.platform);
  if (params.search) qs.set('search', params.search);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';

  try {
    const res = await fetch(`${API_URL}/campaigns${suffix}`, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as Campaign[];
  } catch {
    // Backend chưa sẵn sàng (dev offline...) — hiển thị rỗng thay vì crash trang.
    return [];
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; search?: string }>;
}) {
  const params = await searchParams;
  const campaigns = await fetchPublicCampaigns(params);

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <PublicNav />

      {/* Hero */}
      <div className="border-b border-slate-200 bg-gradient-to-b from-white via-blue-50/20 to-slate-50 px-4 py-10 sm:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-brand-blue-light px-3 py-1 text-xs font-semibold text-brand-blue">
              <ShieldCheck className="h-4 w-4" />
              <span>Nền tảng Kết nối Đánh giá &amp; Khảo sát Thực tế 100%</span>
            </div>

            <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Gia tăng Đánh giá Thực tế,
              <br />
              Nhận Thưởng Dễ Dàng cùng <span className="text-brand-blue">K-Platform</span>.
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Cầu nối minh bạch giữa{' '}
              <strong className="text-slate-900">Doanh nghiệp (Bên A)</strong> cần review trải
              nghiệm thực và <strong className="text-slate-900">Người tiêu dùng (Bên B)</strong>{' '}
              nhận KPoint (1 KP = 1 VNĐ). Tự động đóng dấu Watermark và Auto-Approve sau 48 giờ.
            </p>

            {/* Khối tìm kiếm thật — GET form, không cần JS, hoạt động cả khi disable JS */}
            <form
              action="/"
              className="mt-2 flex max-w-xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center"
            >
              <div className="relative flex-1">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  name="search"
                  defaultValue={params.search}
                  placeholder="Tìm theo thương hiệu, quán ăn, khách sạn, địa chỉ..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-brand-blue focus:outline-none"
                />
              </div>
              <select
                name="platform"
                defaultValue={params.platform ?? ''}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
              >
                {PLATFORM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-xl bg-brand-blue px-5 py-2 text-xs font-bold text-white transition hover:bg-brand-blue-dark"
              >
                Tìm Campaign
              </button>
            </form>
          </div>

          {/* Hero Infographic — quy trình khép kín, không phải minh họa trang trí */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg lg:col-span-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-mono text-xs font-bold text-slate-500 uppercase">
                Quy trình Khép kín (SRS Flow)
              </span>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                ACID Transaction
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-gold text-xs font-bold text-slate-950">
                  1
                </div>
                <div>
                  <strong className="block text-slate-800">Bên A: Tạo Campaign &amp; Ký Quỹ</strong>
                  <span className="text-slate-500">
                    Phí khởi tạo 50k + Khóa tạm KPoint theo số slot.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 p-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-blue text-xs font-bold text-white">
                  2
                </div>
                <div>
                  <strong className="block text-slate-800">
                    Bên B: Trả Lời Survey &amp; Nộp Review
                  </strong>
                  <span className="text-slate-500">
                    Hệ thống tự động chèn Watermark ID chống clone.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
                  3
                </div>
                <div>
                  <strong className="block text-slate-800">Duyệt Thưởng Hoặc Auto 48h</strong>
                  <span className="text-slate-500">
                    KPoint giải ngân về ví Bên B hoặc chuyển sang Dispute.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns Grid */}
      <section className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              Chiến dịch Đang Tuyển
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Tìm kiếm nhiệm vụ phù hợp với vị trí và độ uy tín (Trust Score) của bạn.
            </p>
          </div>
          <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-mono text-xs font-bold text-emerald-600">
            ● {campaigns.length} Chiến dịch Đang Hoạt Động
          </span>
        </div>

        {campaigns.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <p className="font-bold text-slate-800">Chưa có chiến dịch phù hợp</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Thử bỏ bộ lọc hoặc quay lại sau — Campaign mới được Bên A tạo liên tục.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <CampaignTicketCard
                key={c.id}
                id={c.id}
                name={c.title}
                platform={c.platform}
                location={c.location ?? ''}
                slots={c.totalSlots}
                slotsFilled={c.slotsFilled}
                rewardPerSlot={Number(c.rewardPerSlot)}
                dripFeedPerDay={c.dripFeedLimit}
                trustScoreRequired={c.minTrustScore}
                href={`/b/campaigns/${c.id}`}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="flex items-center justify-center gap-1.5 border-t border-slate-200 px-6 py-6 text-center text-xs text-slate-500">
        <MapPin className="h-3.5 w-3.5" />© 2026 K-Platform
      </footer>
    </div>
  );
}
