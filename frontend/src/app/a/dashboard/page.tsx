'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, KpiCard } from '@/components/ui/Card';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { PLATFORM_BADGE, PLATFORM_LABEL, mockCampaigns, mockWallet } from '@/lib/mock-data';
import { formatKpoint } from '@/lib/format';

export default function AdvertiserDashboard() {
  const active = mockCampaigns.filter((c) => c.status === 'active');
  const reviewsThisMonth = 48;

  return (
    <AppShell role="advertiser" active="/a/dashboard">
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Bên A (Advertiser)"
          description="Giám sát chiến dịch quảng bá, KPoint đã ký quỹ và tiến độ nhận review thực tế."
          actions={
            <>
              <Link href="/a/campaigns/new">
                <Button variant="gold">
                  <Plus className="h-4 w-4" />
                  Tạo Campaign Mới
                </Button>
              </Link>
              <Link href="/a/campaigns">
                <Button variant="outline">Duyệt Bài Nộp</Button>
              </Link>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Số Dư Ví Khả Dụng"
            value={formatKpoint(mockWallet.balanceKpoint)}
            valueClassName="text-brand-blue"
            hint={
              <div className="flex items-center justify-between">
                <span>(= {mockWallet.balanceKpoint.toLocaleString('vi-VN')} VNĐ)</span>
                <Link href="/wallet" className="font-bold text-brand-gold hover:underline">
                  Nạp thêm
                </Link>
              </div>
            }
          />
          <KpiCard
            label="Ký Quỹ Đang Khóa (Reserved)"
            value={formatKpoint(mockWallet.reservedKpoint)}
            valueClassName="text-amber-600"
            hint="Bảo chứng trả thưởng cho Bên B"
          />
          <KpiCard
            label="Review Hoàn Tất Tháng Này"
            value={`${reviewsThisMonth} reviews`}
            valueClassName="text-emerald-600"
            hint="100% người dùng thực có bill"
          />
          <KpiCard
            label="Chiến Dịch Đang Chạy"
            value={`${active.length} Campaigns`}
            hint="Drip-feed: 2 - 5 review/ngày"
          />
        </div>

        <Card rounded="2xl" className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase">
              Danh Sách Chiến Dịch Của Tôi
            </h3>
            <span className="hidden text-xs text-slate-400 sm:inline">
              Ràng buộc SRS: Chỉ được Archive, không có quyền xóa campaign cũ
            </span>
          </div>

          <Table>
            <Thead>
              <Th>Campaign ID</Th>
              <Th>Tên chiến dịch</Th>
              <Th>Nền tảng</Th>
              <Th>Tiến độ slots</Th>
              <Th>Drip-feed</Th>
              <Th>Trạng thái</Th>
              <Th className="text-right">Thao tác</Th>
            </Thead>
            <Tbody>
              {mockCampaigns.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70">
                  <Td className="font-mono font-bold text-brand-blue">{c.id}</Td>
                  <Td className="font-bold text-slate-800">{c.name}</Td>
                  <Td>
                    <span
                      className={`rounded border px-2 py-0.5 text-[11px] font-bold ${PLATFORM_BADGE[c.platform]}`}
                    >
                      {PLATFORM_LABEL[c.platform]}
                    </span>
                  </Td>
                  <Td className="font-mono">
                    {c.slotsFilled} / {c.slots} slot ({Math.round((c.slotsFilled / c.slots) * 100)}
                    %)
                  </Td>
                  <Td className="font-mono">{c.dripFeedPerDay} review/ngày</Td>
                  <Td>
                    <Badge tone={c.status === 'active' ? 'positive' : 'neutral'}>
                      {c.status === 'active' ? 'ACTIVE' : 'ARCHIVED'}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Link href={`/a/campaigns/${c.id}`}>
                        <Button variant="blue" size="sm">
                          Duyệt bài
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm">
                        Archive
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      </div>
    </AppShell>
  );
}
