'use client';

import { useState } from 'react';
import { Check, CheckCircle2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { formatKpoint } from '@/lib/format';

const CREATION_FEE = 50_000;

function SectionHeading({
  step,
  color,
  children,
}: {
  step: number;
  color: 'blue' | 'gold' | 'dark';
  children: React.ReactNode;
}) {
  const badge = {
    blue: 'bg-brand-blue text-white',
    gold: 'bg-brand-gold text-slate-950',
    dark: 'bg-slate-900 text-white',
  }[color];
  const text = { blue: 'text-brand-blue', gold: 'text-brand-gold', dark: 'text-slate-800' }[color];

  return (
    <h3 className={`flex items-center gap-2 text-xs font-bold tracking-wider uppercase ${text}`}>
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${badge}`}
      >
        {step}
      </span>
      {children}
    </h3>
  );
}

export default function NewCampaignPage() {
  const [slots, setSlots] = useState(10);
  const [reward, setReward] = useState(50_000);
  const total = CREATION_FEE + slots * reward;

  return (
    <AppShell role="advertiser" active="/a/campaigns">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title="Tạo Campaign Mới & Survey Filter"
          description="Thiết lập điều kiện khảo sát sàng lọc Bên B và cài đặt thuật toán rải review (Drip-feed)."
        />

        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="space-y-4">
            <SectionHeading step={1} color="blue">
              Thông Tin Cơ Bản Về Doanh Nghiệp
            </SectionHeading>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tên Thương hiệu / Cơ sở dịch vụ *">
                <Input defaultValue="The Artisan Roastery Coffee" required />
              </Field>
              <Field label="Địa điểm áp dụng (Tỉnh/Thành)">
                <Input defaultValue="Quận 1, TP. Hồ Chí Minh" />
              </Field>
              <Field label="Nền tảng mục tiêu">
                <Select defaultValue="GOOGLE_MAPS">
                  <option value="GOOGLE_MAPS">Google Maps (Đánh giá địa điểm &amp; Ảnh)</option>
                  <option value="FACEBOOK">Facebook (Check-in bài viết kèm ảnh)</option>
                  <option value="SHOPEE">Shopee / E-Commerce Feedback</option>
                  <option value="TIKTOK">TikTok (Video ngắn trải nghiệm)</option>
                </Select>
              </Field>
              <Field label="Liên kết công khai (Google Maps / Page URL)">
                <Input type="url" defaultValue="https://maps.google.com/?cid=91823101" />
              </Field>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-4">
            <SectionHeading step={2} color="gold">
              Ngân Sách &amp; Cấu Hình Drip-Feed
            </SectionHeading>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Số Lượng Review (Slots)">
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={slots}
                  onChange={(e) => setSlots(Number(e.target.value) || 0)}
                  className="font-mono font-bold"
                />
              </Field>
              <Field label="Mức Thưởng Mỗi Slot (KPoint)">
                <Input
                  type="number"
                  min={10_000}
                  step={5_000}
                  value={reward}
                  onChange={(e) => setReward(Number(e.target.value) || 0)}
                  className="font-mono font-bold"
                />
              </Field>
              <Field label="Giới Hạn Review / Ngày (Drip-feed)">
                <Input
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={5}
                  className="font-mono font-bold"
                />
              </Field>
            </div>

            <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs sm:flex-row sm:items-center">
              <div className="space-y-1">
                <span className="block text-slate-600">
                  Công thức: Phí tạo cố định (50,000 KP) + (Slots × Thưởng):
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xl font-extrabold text-brand-blue">
                    {formatKpoint(total)}
                  </span>
                  <span className="font-mono text-slate-500">
                    (= {total.toLocaleString('vi-VN')} VNĐ)
                  </span>
                </div>
              </div>
              <span className="rounded bg-blue-100 px-2.5 py-1 font-mono text-[11px] font-bold text-brand-blue">
                Khóa tạm (Reserved) khi duyệt Active
              </span>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <SectionHeading step={3} color="dark">
                Bộ Câu Hỏi Khảo Sát Sàng Lọc Bên B (Survey Filter)
              </SectionHeading>
              <button type="button" className="text-xs font-bold text-brand-blue hover:underline">
                + Thêm câu hỏi
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                <label className="block font-bold text-slate-700">
                  Câu hỏi 1: Điều kiện trải nghiệm dịch vụ
                </label>
                <Input defaultValue="Bạn đã dùng bữa tại quán với hóa đơn từ 50.000đ trở lên trong 1 tháng qua chưa?" />
                <div className="flex items-center gap-4 text-[11px] text-slate-600">
                  <span>
                    Loại trả lời: <strong>Có / Không + Bắt buộc tải ảnh Hóa đơn</strong>
                  </span>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                <label className="block font-bold text-slate-700">
                  Yêu cầu chất lượng bằng chứng (Proof):
                </label>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    Bắt buộc có 2 ảnh thực tế (1 ảnh hóa đơn thanh toán + 1 ảnh sản phẩm / không
                    gian quán).
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    Hệ thống tự động chèn Watermark định danh <code>UID + CampaignID</code> chống
                    copy ảnh.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Button variant="blue" className="w-full">
            <Check className="h-5 w-5" />
            Xác Nhận Khởi Tạo Chiến Dịch (Khóa Quỹ {formatKpoint(total)})
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
