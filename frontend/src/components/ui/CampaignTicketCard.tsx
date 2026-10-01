import Link from 'next/link';
import { StatusPill } from './StatusPill';
import { formatKpoint } from '@/lib/format';

interface CampaignTicketCardProps {
  id: string;
  name: string;
  platform: string;
  slots: number;
  slotsFilled: number;
  rewardPerSlot: number;
  status: 'active' | 'archived';
  href?: string;
}

export function CampaignTicketCard({
  id,
  name,
  platform,
  slots,
  slotsFilled,
  rewardPerSlot,
  status,
  href,
}: CampaignTicketCardProps) {
  const full = slotsFilled >= slots;
  const content = (
    <div className="border-line bg-paper-raised flex items-stretch border">
      <div className="min-w-0 flex-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-ink truncate font-medium">{name}</p>
          <StatusPill tone={status === 'active' ? (full ? 'warning' : 'positive') : 'neutral'}>
            {status === 'active' ? (full ? 'Đủ slot' : 'Đang mở') : 'Lưu trữ'}
          </StatusPill>
        </div>
        <p className="text-ink-muted mt-1 text-xs">
          {id} · {platform}
        </p>
        <p className="text-ink-muted mt-3 text-xs">
          Slot đã nhận{' '}
          <span className="font-ledger text-ink font-medium">
            {slotsFilled}/{slots}
          </span>
        </p>
      </div>
      {/* Đường đứt nét ngăn cách — gợi ý "vé", gắn với việc mỗi slot là 1 lượt review thật */}
      <div
        className="border-line w-px border-l"
        style={{ borderStyle: 'dashed' }}
        aria-hidden="true"
      />
      <div className="font-ledger text-navy flex w-36 shrink-0 flex-col items-center justify-center p-4 text-center">
        <span className="text-lg font-semibold">{formatKpoint(rewardPerSlot)}</span>
        <span className="text-ink-muted mt-0.5 text-xs">/ slot</span>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
