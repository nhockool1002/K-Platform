'use client';

import { useState } from 'react';
import { ArrowUpRight, PlusCircle, QrCode, UploadCloud } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { KpiCard } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { mockTransactions, mockWallet } from '@/lib/mock-data';
import { formatKpoint } from '@/lib/format';

const STATUS_TONE: Record<string, BadgeTone> = {
  SUCCESS: 'positive',
  RESERVED: 'warning',
};

export default function WalletPage() {
  const [topupOpen, setTopupOpen] = useState(false);
  const [gateway, setGateway] = useState<'SEPAY' | 'BMC'>('SEPAY');
  const available = mockWallet.balanceKpoint - mockWallet.reservedKpoint;

  return (
    <AppShell active="/wallet">
      <div className="space-y-6">
        <PageHeader
          title="Quản Lý Ví KPoint & Giao Dịch"
          description="Quy chuẩn tài chính: 1 KPoint = 1 VNĐ. Tích hợp cổng VietQR SePay và Buy Me a Coffee quốc tế."
          actions={
            <>
              <Button variant="gold" onClick={() => setTopupOpen(true)}>
                <PlusCircle className="h-4 w-4" />
                Nạp KPoint
              </Button>
              <Button variant="dark">
                <ArrowUpRight className="h-4 w-4" />
                Rút Về Ngân Hàng
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label="Số Dư Ví Khả Dụng"
            value={formatKpoint(available)}
            valueClassName="text-brand-blue text-3xl"
            hint="Khả dụng cho mọi thanh toán / rút tiền"
          />
          <KpiCard
            label="Ký Quỹ Đang Khóa (Reserved)"
            value={formatKpoint(mockWallet.reservedKpoint)}
            valueClassName="text-amber-600 text-3xl"
            hint="Chiến dịch CP-101 & CP-102"
          />
          <KpiCard
            label="Tổng KPoint Đã Chi / Nhận"
            value={formatKpoint(mockWallet.lifetimeFlow)}
            valueClassName="text-slate-800 text-3xl"
            hint="Tổng luân chuyển qua tài khoản"
          />
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase">
              Lịch Sử Biến Động Số Dư (Ledger)
            </h3>
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-xs text-emerald-600">
              ACID Transaction Log
            </span>
          </div>

          <Table>
            <Thead>
              <Th>Mã giao dịch</Th>
              <Th>Thời gian</Th>
              <Th>Loại biến động</Th>
              <Th>Biến động KPoint</Th>
              <Th>Số dư sau GD</Th>
              <Th>Phương thức</Th>
              <Th>Trạng thái</Th>
            </Thead>
            <Tbody>
              {mockTransactions.map((tx) => (
                <tr key={tx.id} className="font-mono hover:bg-slate-50">
                  <Td className="font-bold text-brand-blue">#{tx.id}</Td>
                  <Td className="text-slate-500">{tx.time}</Td>
                  <Td className="font-sans font-semibold text-slate-800">{tx.label}</Td>
                  <Td
                    className={`font-bold ${tx.amount >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}
                  >
                    {tx.amount >= 0 ? '+' : ''}
                    {formatKpoint(tx.amount)}
                  </Td>
                  <Td className="font-bold">{formatKpoint(tx.balanceAfter)}</Td>
                  <Td className="font-sans">{tx.method}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[tx.status]}>{tx.status}</Badge>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>

      <Modal open={topupOpen} onClose={() => setTopupOpen(false)} title="Nạp KPoint Vào Ví">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">1 KPoint = 1 VNĐ</p>
          <div className="flex border-b border-slate-200 text-xs font-bold">
            <button
              onClick={() => setGateway('SEPAY')}
              className={`flex-1 border-b-2 py-2.5 text-center ${gateway === 'SEPAY' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-500'}`}
            >
              VietQR (SePay 24/7)
            </button>
            <button
              onClick={() => setGateway('BMC')}
              className={`flex-1 border-b-2 py-2.5 text-center ${gateway === 'BMC' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-slate-500'}`}
            >
              Buy Me a Coffee (USD)
            </button>
          </div>

          {gateway === 'SEPAY' ? (
            <div className="space-y-3 text-center">
              <div className="inline-block rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <QrCode className="mx-auto h-32 w-32 text-slate-800" />
              </div>
              <div className="text-xs">
                <span className="block text-slate-500">Cú pháp chuyển khoản chuẩn:</span>
                <span className="mt-1 inline-block rounded border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-sm font-bold text-brand-blue">
                  KPOINT USR8829
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 leading-tight text-amber-900">
                Thanh toán qua Buy Me a Coffee (USD) → Nhập Transaction ID và ảnh biên lai để Admin
                CMS duyệt thủ công.
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Mã Giao Dịch BMC ID *</label>
                <Input placeholder="#BMC-99120-TX" />
              </div>
              <Button variant="gold" className="w-full" onClick={() => setTopupOpen(false)}>
                <UploadCloud className="h-4 w-4" />
                Gửi Biên Lai Duyệt Nạp
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </AppShell>
  );
}
