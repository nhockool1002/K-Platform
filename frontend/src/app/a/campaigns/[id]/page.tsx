'use client';

import { use, useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/lib/auth-client';
import {
  decideApplicant,
  getCampaign,
  listApplicants,
  type Applicant,
  type Campaign,
} from '@/lib/campaigns-client';

const STATUS_TONE: Record<string, BadgeTone> = {
  APPLIED: 'warning',
  INVITED: 'positive',
  REJECTED_APPLICATION: 'critical',
};

const STATUS_LABEL: Record<string, string> = {
  APPLIED: 'Chờ Invite',
  INVITED: 'Đã Invite',
  REJECTED_APPLICATION: 'Đã từ chối',
};

export default function ManageCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [applicants, setApplicants] = useState<Applicant[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCampaign(id), listApplicants(id)])
      .then(([c, apps]) => {
        setCampaign(c);
        setApplicants(apps);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu Campaign'),
      );
  }, [id]);

  async function handleDecide(submissionId: string, action: 'INVITE' | 'REJECT') {
    try {
      const updated = await decideApplicant(id, submissionId, action);
      setApplicants((prev) => prev?.map((a) => (a.id === submissionId ? updated : a)) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể xử lý ứng viên');
    }
  }

  return (
    <AppShell role="advertiser" active="/a/campaigns">
      <div className="space-y-6">
        <PageHeader
          title={`Quản Lý Campaign & Ứng Viên${campaign ? ` — ${campaign.title}` : ''}`}
          description="Xem danh sách Bên B nộp Survey ứng tuyển, Invite những ứng viên phù hợp hoặc Từ chối."
        />

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        {applicants === null ? (
          <p className="text-center text-xs text-slate-500">Đang tải...</p>
        ) : applicants.length === 0 ? (
          <EmptyState
            title="Chưa có ứng viên nào"
            body="Khi Bên B ứng tuyển Campaign này, đơn của họ sẽ hiện ở đây để bạn Invite hoặc Từ chối."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {applicants.map((a) => (
              <Card key={a.id} rounded="3xl" className="space-y-4 p-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-bold text-brand-blue">
                      SUBMISSION #{a.id.slice(0, 8)}
                    </span>
                    <h4 className="mt-1 text-base font-extrabold text-slate-900">
                      {a.publisher.email} (Trust: {a.publisher.trustScore})
                    </h4>
                  </div>
                  <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status] ?? a.status}</Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <span className="font-bold text-slate-700">Câu trả lời khảo sát:</span>
                  {a.surveyAnswers && Object.keys(a.surveyAnswers).length > 0 ? (
                    <ul className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3 text-slate-600">
                      {Object.entries(a.surveyAnswers).map(([q, ans]) => (
                        <li key={q}>
                          <strong className="text-slate-800">{q}:</strong> {String(ans)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-slate-400">
                      Campaign này không yêu cầu khảo sát.
                    </p>
                  )}
                </div>

                {a.status === 'APPLIED' && (
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <Button
                      variant="gold"
                      className="flex-1"
                      onClick={() => handleDecide(a.id, 'INVITE')}
                    >
                      <Send className="h-4 w-4" />
                      Chấp Nhận (Invite Làm Review)
                    </Button>
                    <Button variant="outline" onClick={() => handleDecide(a.id, 'REJECT')}>
                      Loại
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
