'use client';

import { use, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, MapPin, Send } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ApiError } from '@/lib/auth-client';
import { formatKpoint } from '@/lib/format';
import { PLATFORM_LABEL } from '@/lib/mock-data';
import {
  applyCampaign,
  getCampaign,
  getDeviceFingerprint,
  type Campaign,
} from '@/lib/campaigns-client';

export default function ApplyCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getCampaign(id)
      .then(setCampaign)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Không tải được Campaign'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await applyCampaign(id, {
        fingerprint: getDeviceFingerprint(),
        surveyAnswers: answers,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell role="publisher" active="/">
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Ứng Tuyển Campaign"
          description="Trả lời khảo sát sàng lọc để được Bên A xem xét Invite."
        />

        {loading && <p className="text-sm text-slate-500">Đang tải...</p>}

        {!loading && error && !campaign && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        {campaign && !done && (
          <Card rounded="3xl" className="space-y-5 p-6 sm:p-8">
            <div className="space-y-1">
              <span className="font-mono text-[10px] font-bold text-brand-blue uppercase">
                {PLATFORM_LABEL[campaign.platform]}
              </span>
              <h2 className="text-lg font-extrabold text-slate-900">{campaign.title}</h2>
              {campaign.location && (
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {campaign.location}
                </p>
              )}
              <p className="text-xs text-slate-500">
                Thưởng: <strong className="text-brand-blue">{formatKpoint(Number(campaign.rewardPerSlot))}</strong>{' '}
                · Trust ≥ {campaign.minTrustScore} · Còn {campaign.totalSlots - campaign.slotsFilled} /{' '}
                {campaign.totalSlots} slot
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {campaign.surveyQuestions && campaign.surveyQuestions.length > 0 ? (
                campaign.surveyQuestions.map((q, i) => (
                  <Field key={i} label={q.question}>
                    {q.answerType === 'YES_NO' ? (
                      <div className="flex gap-4 text-xs">
                        {['Có', 'Không'].map((opt) => (
                          <label key={opt} className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              required
                              name={`q-${i}`}
                              value={opt}
                              onChange={(e) =>
                                setAnswers((a) => ({ ...a, [q.question]: e.target.value }))
                              }
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <Input
                        required
                        onChange={(e) =>
                          setAnswers((a) => ({ ...a, [q.question]: e.target.value }))
                        }
                      />
                    )}
                    {q.requiresReceipt && (
                      <span className="mt-1 block text-[11px] text-slate-400">
                        Bắt buộc tải ảnh hóa đơn khi nộp Proof ở bước sau
                      </span>
                    )}
                  </Field>
                ))
              ) : (
                <p className="text-xs text-slate-500">
                  Campaign này không yêu cầu khảo sát — bấm Ứng tuyển để tiếp tục.
                </p>
              )}

              {error && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {error}
                </p>
              )}

              <Button type="submit" variant="gold" className="w-full" disabled={submitting}>
                <Send className="h-4 w-4" />
                {submitting ? 'Đang gửi...' : 'Gửi Đơn Ứng Tuyển'}
              </Button>
            </form>
          </Card>
        )}

        {done && (
          <Card rounded="3xl" className="space-y-4 p-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h2 className="text-base font-extrabold text-slate-900">Đã gửi đơn ứng tuyển!</h2>
            <p className="text-sm text-slate-500">
              Chờ Bên A Invite — theo dõi trạng thái tại Dashboard của bạn.
            </p>
            <Button variant="blue" onClick={() => router.push('/b/dashboard')}>
              Về Dashboard
            </Button>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
