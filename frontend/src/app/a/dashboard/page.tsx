'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, KpiCard } from '@/components/ui/Card';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { PLATFORM_BADGE, PLATFORM_LABEL } from '@/lib/mock-data';
import { formatKpoint } from '@/lib/format';
import { archiveCampaign, listMyCampaigns, type Campaign } from '@/lib/campaigns-client';
import { ApiError } from '@/lib/auth-client';
import { useWallet } from '@/lib/use-wallet';
import { useActivationStatus } from '@/lib/use-activation-status';
import { ActivationConfirmModal } from '@/components/ActivationConfirmModal';

export default function AdvertiserDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { wallet, loading: walletLoading, refresh: refreshWallet } = useWallet();
  const {
    status: activation,
    loading: activationLoading,
    refresh: refreshActivation,
  } = useActivationStatus();
  // issue #53 — kích hoạt phải qua Modal xác nhận, không trừ phí ngay khi bấm.
  const [confirmOpen, setConfirmOpen] = useState(false);

  const notActivated = !activationLoading && activation !== null && !activation.activated;

  useEffect(() => {
    listMyCampaigns()
      .then(setCampaigns)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Không tải được danh sách Campaign');
        setCampaigns([]);
      });
  }, []);

  async function handleArchive(id: string) {
    try {
      const updated = await archiveCampaign(id);
      setCampaigns((prev) => prev?.map((c) => (c.id === id ? updated : c)) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu trữ Campaign');
    }
  }

  const active = (campaigns ?? []).filter((c) => c.status === 'ACTIVE');

  return (
    <AppShell role="advertiser" active="/a/dashboard">
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Tài Khoản Dịch Vụ"
          description="Giám sát chiến dịch quảng bá, KPoint đã ký quỹ và tiến độ nhận review thực tế."
          actions={
            <>
              {notActivated ? (
                <Button variant="gold" disabled title="Kích hoạt Tài khoản Dịch vụ để tạo Campaign">
                  <Plus className="h-4 w-4" />
                  Tạo Campaign Mới
                </Button>
              ) : (
                <Link href="/a/campaigns/new">
                  <Button variant="gold">
                    <Plus className="h-4 w-4" />
                    Tạo Campaign Mới
                  </Button>
                </Link>
              )}
              <Link href="/a/campaigns">
                <Button variant="outline">Duyệt Bài Nộp</Button>
              </Link>
            </>
          }
        />

        {notActivated && (
          <Card
            rounded="2xl"
            className="flex flex-col gap-3 border-brand-gold/40 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-8 w-8 flex-shrink-0 text-brand-gold" />
              <div>
                <p className="text-sm font-extrabold text-slate-900">
                  Tài khoản Dịch vụ của bạn chưa được kích hoạt
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Kích hoạt 1 lần với {formatKpoint(Number(activation?.feeKpoint ?? 0))} KPoint để
                  mở chức năng tạo Campaign. Phí trừ trực tiếp từ Số Dư Ví Khả Dụng.
                </p>
              </div>
            </div>
            <Button variant="gold" onClick={() => setConfirmOpen(true)}>
              Kích hoạt ngay
            </Button>
          </Card>
        )}

        <ActivationConfirmModal
          open={confirmOpen}
          feeKpoint={activation?.feeKpoint ?? 0}
          onClose={() => setConfirmOpen(false)}
          onActivated={() => {
            setConfirmOpen(false);
            refreshActivation();
            refreshWallet();
          }}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Số Dư Ví Khả Dụng"
            value={walletLoading || !wallet ? '···' : formatKpoint(Number(wallet.availableKpoint))}
            valueClassName="text-brand-blue"
            hint={
              <div className="flex items-center justify-between">
                <span>
                  {wallet
                    ? `(= ${Number(wallet.availableKpoint).toLocaleString('vi-VN')} VNĐ)`
                    : ''}
                </span>
                <Link href="/wallet" className="font-bold text-brand-gold hover:underline">
                  Nạp thêm
                </Link>
              </div>
            }
          />
          <KpiCard
            label="Ký Quỹ Đang Khóa (Reserved)"
            value={walletLoading || !wallet ? '···' : formatKpoint(Number(wallet.reservedKpoint))}
            valueClassName="text-amber-600"
            hint="Bảo chứng trả thưởng cho Tài khoản Người dùng"
          />
          <KpiCard
            label="Tổng Slot Đã Chiếm"
            value={`${active.reduce((sum, c) => sum + c.slotsFilled, 0)} slot`}
            valueClassName="text-emerald-600"
          />
          <KpiCard
            label="Chiến Dịch Đang Chạy"
            value={`${active.length} Campaigns`}
            hint={campaigns === null ? 'Đang tải...' : undefined}
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

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}

          {campaigns === null ? (
            <p className="py-6 text-center text-xs text-slate-500">Đang tải Campaign...</p>
          ) : campaigns.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">
              Bạn chưa có Campaign nào —{' '}
              {notActivated ? (
                <span className="font-bold text-slate-400">kích hoạt Tài khoản Dịch vụ ở trên</span>
              ) : (
                <Link href="/a/campaigns/new" className="font-bold text-brand-blue hover:underline">
                  tạo Campaign đầu tiên
                </Link>
              )}
              .
            </p>
          ) : (
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
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <Td className="font-mono font-bold text-brand-blue">{c.id.slice(0, 8)}</Td>
                    <Td className="font-bold text-slate-800">{c.title}</Td>
                    <Td>
                      <span
                        className={`rounded border px-2 py-0.5 text-[11px] font-bold ${PLATFORM_BADGE[c.platform]}`}
                      >
                        {PLATFORM_LABEL[c.platform]}
                      </span>
                    </Td>
                    <Td className="font-mono">
                      {c.slotsFilled} / {c.totalSlots} slot (
                      {Math.round((c.slotsFilled / c.totalSlots) * 100)}%)
                    </Td>
                    <Td className="font-mono">{c.dripFeedLimit} review/ngày</Td>
                    <Td>
                      <Badge tone={c.status === 'ACTIVE' ? 'positive' : 'neutral'}>
                        {c.status}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Link href={`/a/campaigns/${c.id}`}>
                          <Button variant="blue" size="sm">
                            Duyệt bài
                          </Button>
                        </Link>
                        {c.status === 'ACTIVE' && (
                          <Button variant="outline" size="sm" onClick={() => handleArchive(c.id)}>
                            Archive
                          </Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
