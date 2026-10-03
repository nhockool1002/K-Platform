'use client';

import { useState } from 'react';
import { Eye, FileCheck } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { formatKpoint } from '@/lib/format';
import { mockBmcTopups } from '@/lib/mock-data';

export default function CmsPaymentsPage() {
  const [preview, setPreview] = useState<(typeof mockBmcTopups)[number] | null>(null);

  return (
    <CmsShell active="/cms/payments">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">
            SCR-10: CMS Duyệt Nạp Tiền Quốc Tế (Buy Me a Coffee)
          </h3>
        </div>

        <Table>
          <Thead>
            <Th>Transaction ID</Th>
            <Th>User (Tài khoản Dịch vụ)</Th>
            <Th>Số tiền (USD)</Th>
            <Th>KPoint quy đổi</Th>
            <Th>Receipt</Th>
            <Th className="text-right">Thao tác (ACID)</Th>
          </Thead>
          <Tbody>
            {mockBmcTopups.map((tp) => (
              <tr key={tp.id} className="hover:bg-slate-50">
                <Td className="font-mono font-bold text-brand-blue">#{tp.id}</Td>
                <Td>{tp.user}</Td>
                <Td className="font-mono font-bold text-slate-900">
                  ${tp.amountUsd.toFixed(2)} USD
                </Td>
                <Td className="font-mono font-bold text-emerald-600">
                  +{formatKpoint(tp.kpointAmount)}
                </Td>
                <Td>
                  <button
                    onClick={() => setPreview(tp)}
                    className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 font-bold text-brand-blue hover:bg-blue-100"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Xem ảnh bill</span>
                  </button>
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button variant="dark" size="sm">
                      Approve
                    </Button>
                    <Button variant="danger-ghost" size="sm">
                      Từ chối
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      </div>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        eyebrow="SCR-10 • Đối soát biên lai"
        title={`Chi tiết Biên lai #${preview?.id ?? ''}`}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setPreview(null)}>
              Đóng
            </Button>
            <Button variant="dark" size="sm" onClick={() => setPreview(null)}>
              Xác nhận Phê duyệt
            </Button>
          </>
        }
      >
        {preview && (
          <div className="space-y-3 text-xs">
            <div className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Khách hàng:</span>
                <strong className="font-semibold text-slate-800">{preview.user}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số tiền thanh toán:</span>
                <strong className="font-mono font-bold text-emerald-600">
                  ${preview.amountUsd.toFixed(2)} USD
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trạng thái:</span>
                <Badge tone="warning">{preview.status}</Badge>
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100 p-6 text-center">
              <FileCheck className="mx-auto h-10 w-10 text-brand-blue" />
              <span className="block text-xs font-bold text-slate-700">
                Ảnh chụp Receipt từ Buy Me a Coffee (Receipt.png)
              </span>
              <p className="font-mono text-[11px] text-slate-500">
                Txn Hash: bmc_ch_3N18Fa2eZvKYlo2C • Đã khớp tài khoản nhận K-Platform
              </p>
            </div>
          </div>
        )}
      </Modal>
    </CmsShell>
  );
}
