'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { formatKpoint } from '@/lib/format';
import { ApiError } from '@/lib/auth-client';
import { createCampaign, type SurveyQuestion } from '@/lib/campaigns-client';
import type { PlatformKey } from '@/lib/mock-data';

const CREATION_FEE = 50_000;

function SectionHeading({
  step,
  color,
  children,
}: {
  step: number;
  color: 'blue' | 'gold' | 'dark';
  children: ReactNode;
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
  const router = useRouter();

  const [title, setTitle] = useState('The Artisan Roastery Coffee');
  const [location, setLocation] = useState('Quận 1, TP. Hồ Chí Minh');
  const [platform, setPlatform] = useState<PlatformKey>('GOOGLE_MAPS');
  const [slots, setSlots] = useState(10);
  const [reward, setReward] = useState(50_000);
  const [dripFeed, setDripFeed] = useState(5);
  const [minTrustScore, setMinTrustScore] = useState(80);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([
    {
      question: 'Bạn đã dùng bữa tại quán với hóa đơn từ 50.000đ trở lên trong 1 tháng qua chưa?',
      answerType: 'YES_NO',
      requiresReceipt: true,
    },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const total = CREATION_FEE + slots * reward;

  function addQuestion() {
    setQuestions((qs) => [...qs, { question: '', answerType: 'TEXT' }]);
  }

  function updateQuestion(index: number, patch: Partial<SurveyQuestion>) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function removeQuestion(index: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const campaign = await createCampaign({
        title,
        platform,
        location: location || undefined,
        totalSlots: slots,
        rewardPerSlot: reward,
        dripFeedLimit: dripFeed,
        minTrustScore,
        surveyQuestions: questions.filter((q) => q.question.trim().length > 0),
      });
      router.push(`/a/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell role="advertiser" active="/a/campaigns">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title="Tạo Campaign Mới & Survey Filter"
          description="Thiết lập điều kiện khảo sát sàng lọc Bên B và cài đặt thuật toán rải review (Drip-feed)."
        />

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="space-y-4">
            <SectionHeading step={1} color="blue">
              Thông Tin Cơ Bản Về Doanh Nghiệp
            </SectionHeading>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tên Thương hiệu / Cơ sở dịch vụ *">
                <Input
                  required
                  minLength={3}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>
              <Field label="Địa điểm áp dụng (Tỉnh/Thành)">
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </Field>
              <Field label="Nền tảng mục tiêu">
                <Select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as PlatformKey)}
                >
                  <option value="GOOGLE_MAPS">Google Maps (Đánh giá địa điểm &amp; Ảnh)</option>
                  <option value="FACEBOOK">Facebook (Check-in bài viết kèm ảnh)</option>
                  <option value="SHOPEE">Shopee / E-Commerce Feedback</option>
                  <option value="TIKTOK">TikTok (Video ngắn trải nghiệm)</option>
                </Select>
              </Field>
              <Field label="Trust Score tối thiểu yêu cầu">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={minTrustScore}
                  onChange={(e) => setMinTrustScore(Number(e.target.value) || 0)}
                  className="font-mono font-bold"
                />
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
                  max={1000}
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
                  max={100}
                  value={dripFeed}
                  onChange={(e) => setDripFeed(Number(e.target.value) || 0)}
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
              <button
                type="button"
                onClick={addQuestion}
                className="text-xs font-bold text-brand-blue hover:underline"
              >
                + Thêm câu hỏi
              </button>
            </div>

            <div className="space-y-3">
              {questions.length === 0 && (
                <p className="text-xs text-slate-400">
                  Chưa có câu hỏi nào — Bên B sẽ ứng tuyển trực tiếp không cần khảo sát.
                </p>
              )}
              {questions.map((q, i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-700">Câu hỏi {i + 1}</label>
                    <button
                      type="button"
                      onClick={() => removeQuestion(i)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Input
                    placeholder="Nội dung câu hỏi..."
                    value={q.question}
                    onChange={(e) => updateQuestion(i, { question: e.target.value })}
                  />
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-1.5">
                      <span className="text-slate-600">Loại trả lời:</span>
                      <select
                        value={q.answerType}
                        onChange={(e) =>
                          updateQuestion(i, {
                            answerType: e.target.value as SurveyQuestion['answerType'],
                          })
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1"
                      >
                        <option value="YES_NO">Có / Không</option>
                        <option value="TEXT">Trả lời tự do</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5 text-slate-600">
                      <input
                        type="checkbox"
                        checked={!!q.requiresReceipt}
                        onChange={(e) => updateQuestion(i, { requiresReceipt: e.target.checked })}
                      />
                      Bắt buộc tải ảnh hóa đơn
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}

          <Button variant="blue" type="submit" className="w-full" disabled={submitting}>
            <Check className="h-5 w-5" />
            {submitting
              ? 'Đang khởi tạo...'
              : `Xác Nhận Khởi Tạo Chiến Dịch (Khóa Quỹ ${formatKpoint(total)})`}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
