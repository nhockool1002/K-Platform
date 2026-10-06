'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { ApiError } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePermissions } from '@/lib/use-permissions';
import {
  getAuditLog,
  listAuditLogs,
  type AuditLevel,
  type AuditLogDetail,
  type AuditLogPage,
} from '@/lib/admin-audit-client';

const PAGE_SIZE = 20;

const LEVEL_TONE: Record<AuditLevel, BadgeTone> = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

const ACTION_OPTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'DISPUTE_RESOLVE',
  'MANUAL_TOPUP',
  'LOGIN',
  'WEBHOOK',
];

interface Filters {
  actor: string;
  role: string;
  action: string;
  level: '' | AuditLevel;
  ip: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: Filters = {
  actor: '',
  role: '',
  action: '',
  level: '',
  ip: '',
  from: '',
  to: '',
};

function toIso(local: string): string | undefined {
  return local ? new Date(local).toISOString() : undefined;
}

export default function AuditLogsPage() {
  const { loading: userLoading } = useCurrentUser();
  const perms = usePermissions();
  const permsLoading = perms.loading;
  const isAdmin = perms.can('audit_logs', 'READ');

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AuditLogPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AuditLogDetail | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    listAuditLogs({
      page,
      pageSize: PAGE_SIZE,
      actor: applied.actor || undefined,
      role: applied.role || undefined,
      action: applied.action || undefined,
      level: applied.level || undefined,
      ip: applied.ip || undefined,
      from: toIso(applied.from),
      to: toIso(applied.to),
    })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Không tải được nhật ký');
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, applied, page]);

  async function openDetail(id: string) {
    try {
      setDetail(await getAuditLog(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được chi tiết');
    }
  }

  function applyFilters() {
    setPage(1);
    setApplied(draft);
  }

  if (!userLoading && !permsLoading && !isAdmin) {
    return (
      <CmsShell active="/cms/audit-logs">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-bold text-slate-800">Không đủ quyền truy cập</p>
          <p className="text-xs text-slate-500">
            Bạn chưa được cấp quyền truy cập chức năng này. Liên hệ quản trị viên để được cấp quyền.
          </p>
        </div>
      </CmsShell>
    );
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <CmsShell active="/cms/audit-logs">
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">SCR-13: Nhật Ký Audit Logs</h3>
          <p className="mt-1 text-xs text-slate-500">
            Mọi thao tác ghi dữ liệu (kể cả request bị từ chối) kèm IP, User-Agent và fingerprint
            thiết bị. Mức <strong className="text-rose-600">CRITICAL</strong> là hành động nhạy cảm
            cần rà soát.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:grid-cols-4">
          <Field label="Actor (email)">
            <Input
              value={draft.actor}
              onChange={(e) => setDraft((d) => ({ ...d, actor: e.target.value }))}
              placeholder="admin@..."
            />
          </Field>
          <Field label="Vai trò">
            <Select
              value={draft.role}
              onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
            >
              <option value="">Tất cả</option>
              <option value="USER">USER</option>
              <option value="MODERATOR">MODERATOR</option>
              <option value="ADMIN">ADMIN</option>
              <option value="ROOT_ADMIN">ROOT_ADMIN</option>
            </Select>
          </Field>
          <Field label="Hành động">
            <Select
              value={draft.action}
              onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
            >
              <option value="">Tất cả</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mức độ">
            <Select
              value={draft.level}
              onChange={(e) =>
                setDraft((d) => ({ ...d, level: e.target.value as Filters['level'] }))
              }
            >
              <option value="">Tất cả</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="WARNING">WARNING</option>
              <option value="INFO">INFO</option>
            </Select>
          </Field>
          <Field label="IP">
            <Input
              value={draft.ip}
              onChange={(e) => setDraft((d) => ({ ...d, ip: e.target.value }))}
              placeholder="203.0.113..."
            />
          </Field>
          <Field label="Từ">
            <Input
              type="datetime-local"
              value={draft.from}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
            />
          </Field>
          <Field label="Đến">
            <Input
              type="datetime-local"
              value={draft.to}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            />
          </Field>
          <div className="flex items-end">
            <Button variant="dark" className="w-full" onClick={applyFilters}>
              Lọc nhật ký
            </Button>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        {data === null ? (
          <p className="py-6 text-center text-xs text-slate-500">Đang tải...</p>
        ) : data.items.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">Không có bản ghi nào.</p>
        ) : (
          <Table>
            <Thead>
              <Th>Thời gian</Th>
              <Th>Actor</Th>
              <Th>Hành động</Th>
              <Th>Tài nguyên</Th>
              <Th>Status</Th>
              <Th>IP &amp; Fingerprint</Th>
              <Th>Mức độ</Th>
              <Th className="text-right">Chi tiết</Th>
            </Thead>
            <Tbody>
              {data.items.map((log) => (
                <tr
                  key={log.id}
                  className={`font-mono text-[11px] hover:bg-slate-50 ${log.level === 'CRITICAL' ? 'bg-rose-50/40' : ''}`}
                >
                  <Td className="text-slate-500">
                    {new Date(log.createdAt).toLocaleString('vi-VN')}
                  </Td>
                  <Td className="font-bold text-slate-800">
                    {log.actor?.email ?? '— (ẩn danh)'}
                    {log.actorRole && (
                      <div className="text-[10px] font-normal text-slate-400">{log.actorRole}</div>
                    )}
                  </Td>
                  <Td className="font-bold text-brand-blue">{log.actionType}</Td>
                  <Td className="max-w-[260px] truncate">
                    {log.method} {log.path ?? log.targetResource}
                  </Td>
                  <Td>{log.statusCode ?? '—'}</Td>
                  <Td className="text-slate-500">
                    {log.ip ?? '—'}
                    {log.deviceFingerprint && (
                      <div className="text-[10px] text-slate-400">
                        fp {log.deviceFingerprint.slice(0, 12)}…
                      </div>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={LEVEL_TONE[log.level]}>{log.level}</Badge>
                  </Td>
                  <Td className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openDetail(log.id)}>
                      Xem JSON
                    </Button>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}

        {data && data.total > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {data.total.toLocaleString('vi-VN')} bản ghi · trang {page}/{totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Chi tiết nhật ký"
        maxWidth="max-w-2xl"
      >
        {detail && (
          <div className="space-y-3 font-mono text-[11px]">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span>Actor: {detail.actor?.email ?? 'ẩn danh'}</span>
              <span>Role: {detail.actorRole ?? '—'}</span>
              <span>IP: {detail.ip ?? '—'}</span>
              <span>Status: {detail.statusCode ?? '—'}</span>
              <span className="col-span-2 truncate">UA: {detail.userAgent ?? '—'}</span>
              <span className="col-span-2 truncate">
                Fingerprint: {detail.deviceFingerprint ?? '—'}
              </span>
            </div>
            {(
              [
                ['Request payload', detail.requestPayload],
                ['Trước (before)', detail.payloadBefore],
                ['Sau (after)', detail.payloadAfter],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <p className="mb-1 font-bold text-slate-600">{label}</p>
                <pre className="max-h-48 overflow-auto rounded-xl bg-slate-900 p-3 text-slate-100">
                  {value === null || value === undefined ? 'null' : JSON.stringify(value, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </CmsShell>
  );
}
