import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatStrip } from '@/components/ui/StatStrip';
import { formatKpoint } from '@/lib/format';

export default function CmsOverviewPage() {
  return (
    <AppShell role="admin" active="/cms/overview">
      <PageHeader
        title="Tổng quan hệ thống"
        description="Số liệu lưu thông KPoint và hoạt động nền tảng trong 30 ngày gần nhất."
      />

      <StatStrip
        stats={[
          { label: 'KPoint đang lưu thông', value: formatKpoint(48_200_000) },
          { label: 'Lượt review / ngày (TB)', value: '312' },
          { label: 'Doanh thu phí khởi tạo', value: formatKpoint(6_400_000) },
          { label: 'Tranh chấp đang mở', value: '3', hint: 'Cần Moderator xử lý' },
        ]}
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="border-line border p-5">
          <h2 className="font-display text-ink text-base font-medium">
            KPoint lưu thông theo tuần
          </h2>
          <div className="mt-4 flex h-40 items-end gap-2">
            {[38, 52, 44, 61, 58, 70, 66].map((h, i) => (
              <div key={i} className="bg-navy/80 flex-1" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="border-line border p-5">
          <h2 className="font-display text-ink text-base font-medium">Cảnh báo gần đây</h2>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            <li className="border-ledger-red flex items-start gap-2 border-l-2 pl-3">
              <span className="text-ink">Đăng nhập từ IP lạ — user publisher@kplatform.dev</span>
            </li>
            <li className="border-gold flex items-start gap-2 border-l-2 pl-3">
              <span className="text-ink">
                2 giao dịch Buy Me a Coffee đang chờ đối soát quá 12h
              </span>
            </li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
