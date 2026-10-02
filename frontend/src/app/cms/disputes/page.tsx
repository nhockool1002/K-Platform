import { CmsShell } from '@/components/layout/CmsShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatKpoint } from '@/lib/format';
import { mockDisputes } from '@/lib/mock-data';

export default function DisputeCenterPage() {
  const current = mockDisputes[0];

  return (
    <CmsShell active="/cms/disputes">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">
            SCR-11: CMS Dispute Center (Tranh Chấp 2 Cấp)
          </h3>
        </div>

        <div className="space-y-3 rounded-2xl border-2 border-purple-200 bg-purple-50/20 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-purple-900">
              CASE #{current.id} • KPoint Phong Tỏa: {formatKpoint(current.amountLocked)}
            </span>
            <Badge tone="purple">Đang Thẩm Định</Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
            <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-3">
              <strong className="block text-amber-700">
                Lý do Bên A từ chối — {current.partyA.name} ({current.partyA.uid})
              </strong>
              <p className="text-slate-600">&ldquo;{current.partyA.reason}&rdquo;</p>
            </div>
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <strong className="block text-brand-blue">
                Bên B khiếu nại — {current.partyB.name} (Trust: {current.partyB.trustScore})
              </strong>
              <p className="text-slate-600">&ldquo;{current.partyB.appeal}&rdquo;</p>
              <div className="watermark-overlay rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-center">
                <span className="font-mono text-[10px] font-bold text-brand-blue">
                  WATERMARK: {current.partyB.watermark}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-purple-100 pt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">Moderator:</span>
              <button className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-brand-blue transition hover:bg-blue-100">
                Pend App
              </button>
              <Button variant="outline" size="sm">
                Pend Reject
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">Admin Phán Quyết:</span>
              <button className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700">
                Thắng Bên B
              </button>
              <Button variant="dark" size="sm">
                Hoàn Bên A
              </Button>
            </div>
          </div>
        </div>
      </div>
    </CmsShell>
  );
}
