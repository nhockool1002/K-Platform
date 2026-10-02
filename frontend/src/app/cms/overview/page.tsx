import { CmsShell } from '@/components/layout/CmsShell';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/Card';
import { formatKpoint } from '@/lib/format';
import { mockBmcTopups, mockDisputes } from '@/lib/mock-data';

export default function CmsOverviewPage() {
  return (
    <CmsShell active="/cms/overview">
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">
            SCR-09: Thống Kê Tổng Quan &amp; Sức Khỏe Nền Tảng
          </h3>
          <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-600">
            System: Healthy
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="KPoint Lưu Thông"
            value={formatKpoint(284_520_000)}
            hint="↑ 12.4% so với tuần trước"
            hintClassName="text-emerald-600"
          />
          <KpiCard
            label="Quỹ Ký Quỹ Đang Khóa"
            value={formatKpoint(48_250_000)}
            valueClassName="text-brand-blue"
            hint="100% thanh khoản bảo chứng"
          />
          <KpiCard
            label="Review Hôm Nay"
            value="142 reviews"
            hint="Auto-Approve 48h: 18 ca"
            hintClassName="text-emerald-600"
          />
          <KpiCard
            label="Doanh Thu Phí Tạo Camp"
            value={formatKpoint(12_450_000)}
            valueClassName="text-purple-700"
            hint="Phí cố định 50k / campaign"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 pt-2 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase">
              Chiến Dịch Mới Kích Hoạt
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2">
                <div>
                  <span className="block font-bold text-slate-800">The Artisan Roastery</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    CP-101 • 20 slots • Drip-feed 5/ngày
                  </span>
                </div>
                <span className="font-mono font-bold text-emerald-700">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2">
                <div>
                  <span className="block font-bold text-slate-800">Phòng Khám Răng Quốc Tế</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    CP-102 • 15 slots • Drip-feed 3/ngày
                  </span>
                </div>
                <span className="font-mono font-bold text-emerald-700">ACTIVE</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase">
              Cảnh Báo Yêu Cầu Xử Lý Nhanh
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-2">
                <span className="font-medium text-amber-900">
                  {mockBmcTopups.length} Yêu cầu Nạp Buy Me a Coffee chờ đối soát
                </span>
                <Badge tone="gold">Duyệt ngay</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 p-2">
                <span className="font-medium text-purple-900">
                  {mockDisputes.filter((d) => d.status === 'open').length} Hồ sơ Khiếu nại chờ phán
                  quyết
                </span>
                <Badge tone="purple">Xử lý</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CmsShell>
  );
}
