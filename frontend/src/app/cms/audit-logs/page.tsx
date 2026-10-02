'use client';

import { useState } from 'react';
import { Filter, MinusCircle, PlusCircle } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { mockAuditLogs } from '@/lib/mock-data';

const LEVEL_TONE: Record<string, BadgeTone> = {
  info: 'info',
  warning: 'warning',
  critical: 'critical',
};

function formatJson(value: unknown): string {
  return value === null ? 'null' : JSON.stringify(value, null, 2);
}

export default function AuditLogsPage() {
  const [active, setActive] = useState<(typeof mockAuditLogs)[number] | null>(null);

  return (
    <CmsShell active="/cms/audit-logs">
      <div className="space-y-4">
        <div className="space-y-0.5 border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">
            SCR-13: Quản Lý Nhật Ký Kiểm Toán Toàn Hệ Thống (Audit Logs)
          </h3>
          <p className="text-xs text-slate-500">
            Ghi nhận toàn bộ thao tác nhạy cảm, giao dịch tài chính &amp; JSON Diff theo chuẩn
            FN-LOG-01
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:grid-cols-12">
          <div className="sm:col-span-3">
            <label className="mb-1 block font-bold text-slate-600">Actor (User ID / Email)</label>
            <input
              type="text"
              placeholder="root_001, adm_024..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="mb-1 block font-bold text-slate-600">Loại hành động</label>
            <Select defaultValue="ALL" className="py-1.5">
              <option value="ALL">Tất cả hành động</option>
              <option value="MANUAL_TOPUP">MANUAL_TOPUP (Duyệt nạp ví)</option>
              <option value="DISPUTE_RESOLVE">DISPUTE_RESOLVE (Phán quyết)</option>
              <option value="CAMPAIGN_CREATE">CAMPAIGN_CREATE (Khởi tạo camp)</option>
            </Select>
          </div>
          <div className="sm:col-span-3">
            <label className="mb-1 block font-bold text-slate-600">Mức độ cảnh báo</label>
            <Select defaultValue="ALL" className="py-1.5">
              <option value="ALL">Tất cả mức độ</option>
              <option value="CRITICAL">🔴 CRITICAL</option>
              <option value="WARNING">🟡 WARNING</option>
              <option value="INFO">🟢 INFO</option>
            </Select>
          </div>
          <div className="flex items-end sm:col-span-3">
            <button className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 font-bold text-white transition hover:bg-slate-800">
              <Filter className="h-3.5 w-3.5" />
              <span>Lọc Nhật Ký</span>
            </button>
          </div>
        </div>

        <Table>
          <Thead>
            <Th>Timestamp</Th>
            <Th>Actor</Th>
            <Th>Hành động</Th>
            <Th>Tài nguyên (Target)</Th>
            <Th>IP &amp; Fingerprint</Th>
            <Th>Mức độ</Th>
            <Th className="text-right">Chi tiết</Th>
          </Thead>
          <Tbody>
            {mockAuditLogs.map((log) => (
              <tr
                key={log.id}
                className={`font-mono text-[11px] hover:bg-slate-50 ${log.level === 'critical' ? 'bg-rose-50/20' : ''}`}
              >
                <Td className="text-slate-500">{log.time}</Td>
                <Td className="font-bold text-slate-800">{log.actor}</Td>
                <Td className="font-bold text-brand-blue">{log.action}</Td>
                <Td>{log.resource}</Td>
                <Td className="text-slate-500">
                  {log.ip}
                  <br />
                  <span className="text-[10px] text-slate-400">{log.fingerprint}</span>
                </Td>
                <Td>
                  <Badge tone={LEVEL_TONE[log.level]}>{log.level.toUpperCase()}</Badge>
                </Td>
                <Td className="text-right">
                  <button
                    onClick={() => setActive(log)}
                    className="rounded border border-slate-300 bg-slate-100 px-2.5 py-1 font-bold text-slate-800 hover:bg-slate-200"
                  >
                    JSON Diff
                  </button>
                </Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      </div>

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        eyebrow="SCR-13 • Audit Log Inspector"
        title={`Chi tiết thay đổi dữ liệu: [${active?.action ?? ''}]`}
        maxWidth="max-w-2xl"
        footer={
          <button
            onClick={() => setActive(null)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
          >
            Đóng
          </button>
        }
      >
        {active && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs text-slate-500">
              <span>
                Target: <strong className="text-slate-800">{active.resource}</strong>
              </span>
              <span>
                Actor: <strong className="text-brand-blue">{active.actor}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 font-mono text-xs sm:grid-cols-2">
              <div className="space-y-1">
                <span className="flex items-center gap-1 font-bold text-rose-600">
                  <MinusCircle className="h-3.5 w-3.5" />
                  <span>Dữ liệu cũ (Old Value):</span>
                </span>
                <pre className="json-code max-h-48 overflow-x-auto rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-rose-950">
                  {formatJson(active.diffOld)}
                </pre>
              </div>
              <div className="space-y-1">
                <span className="flex items-center gap-1 font-bold text-emerald-600">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Dữ liệu mới (New Value):</span>
                </span>
                <pre className="json-code max-h-48 overflow-x-auto rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-emerald-950">
                  {formatJson(active.diffNew)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </CmsShell>
  );
}
