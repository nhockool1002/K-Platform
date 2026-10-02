import Link from 'next/link';
import { MapPin, ArrowRight } from 'lucide-react';
import { formatKpoint } from '@/lib/format';
import { PLATFORM_BADGE, PLATFORM_LABEL, type PlatformKey } from '@/lib/mock-data';

interface CampaignTicketCardProps {
  id: string;
  name: string;
  platform: PlatformKey;
  location: string;
  slots: number;
  slotsFilled: number;
  rewardPerSlot: number;
  dripFeedPerDay: number;
  trustScoreRequired: number;
  href?: string;
  ctaLabel?: string;
}

export function CampaignTicketCard({
  id,
  name,
  platform,
  location,
  slots,
  slotsFilled,
  rewardPerSlot,
  dripFeedPerDay,
  trustScoreRequired,
  href,
  ctaLabel = 'Ứng tuyển',
}: CampaignTicketCardProps) {
  const slotsLeft = slots - slotsFilled;
  const progress = Math.round((slotsFilled / slots) * 100);

  const content = (
    <div className="group flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 transition-all hover:border-brand-blue/30 hover:shadow-lg">
      <div>
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span
            className={`rounded-lg border px-2.5 py-0.5 text-xs font-bold ${PLATFORM_BADGE[platform]}`}
          >
            {PLATFORM_LABEL[platform]}
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Drip: {dripFeedPerDay} review/ngày
          </span>
        </div>

        <h3 className="line-clamp-2 text-sm font-extrabold text-slate-900 transition group-hover:text-brand-blue sm:text-base">
          {name}
        </h3>

        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">
            {id} · {location}
          </span>
        </p>
      </div>

      <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">
              Thưởng hoàn thành
            </span>
            <span className="font-mono text-lg font-extrabold text-brand-blue">
              {formatKpoint(rewardPerSlot)}
            </span>
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">
              Suất còn lại
            </span>
            <span
              className={`font-mono text-xs font-bold ${slotsLeft <= 3 ? 'text-rose-600' : 'text-amber-600'}`}
            >
              {slotsLeft} / {slots} slot
            </span>
          </div>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-gold" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-500">Trust ≥ {trustScoreRequired}</span>
          <span className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white transition group-hover:bg-brand-blue">
            {ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}
