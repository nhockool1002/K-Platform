'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { ApiError } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePermissions } from '@/lib/use-permissions';
import { decideAdminProof, listAdminProofs, type AdminProof } from '@/lib/admin-submissions-client';

// SCR-22 — hàng đợi Proof chờ duyệt. Admin/Mod duyệt hoặc từ chối thủ công,
// không cần là chủ Campaign. Bộ lọc "watermark kẹt" tìm Proof đã nộp nhưng
// job chèn watermark chưa xong sau 10 phút.
export default function CmsSubmissionsPage() {
  const { loading: userLoading } = useCurrentUser();
  const perms = usePermissions();
  const canRead = perms.can('submissions', 'READ');
  const canDecide = perms.can('submissions', 'APPROVE');

  const [stuckOnly, setStuckOnly] = useState(false);
  const [rows, setRows] = useState<AdminProof[] | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    listAdminProofs(stuckOnly)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Không tải được Proof');
      });
    return () => {
      cancelled = true;
    };
  }, [canRead, stuckOnly, reloadKey]);

  async function decide(id: string, action: 'APPROVE' | 'REJECT') {
    setBusyId(id);
    setError(null);
    try {
      await decideAdminProof(id, action, action === 'REJECT' ? reason.trim() : undefined);
      setRows((prev) => prev?.filter((r) => r.id !== id) ?? null);
      setRejectingId(null);
      setReason('');
      setInfo(action === 'APPROVE' ? 'Đã duyệt Proof và trả thưởng.' : 'Đã từ chối Proof.');
      setTimeout(() => setInfo(null), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không xử lý được Proof');
      // Đồng bộ lại danh sách: Proof có thể vừa được xử lý ở nơi khác.
      setReloadKey((k) => k + 1);
    } finally {
      setBusyId(null);
    }
  }

  if (!userLoading && !perms.loading && !canRead) {
    return (
      <CmsShell active="/cms/submissions">
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

  return (
    <CmsShell active="/cms/submissions">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Duyệt Proof thủ công</h3>
            <p className="mt-1 text-xs text-slate-500">
              Proof chờ duyệt, xếp theo thời gian nộp (cũ nhất trước). Proof không được duyệt trong
              48 giờ sẽ tự động duyệt.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={stuckOnly ? 'outline' : 'blue'}
              size="sm"
              onClick={() => setStuckOnly(false)}
            >
              Tất cả chờ duyệt
            </Button>
            <Button
              variant={stuckOnly ? 'blue' : 'outline'}
              size="sm"
              onClick={() => setStuckOnly(true)}
            >
              Watermark kẹt
            </Button>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {info}
          </p>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <Table>
            <Thead>
              <Th>Campaign</Th>
              <Th>Bên B</Th>
              <Th>Proof</Th>
              <Th>Nộp lúc</Th>
              <Th>Quyết định</Th>
            </Thead>
            <Tbody>
              {rows === null ? (
                <tr>
                  <Td colSpan={5} className="py-6 text-center text-slate-400">
                    Đang tải...
                  </Td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <Td colSpan={5} className="py-6 text-center text-slate-400">
                    {stuckOnly
                      ? 'Không có Proof nào bị kẹt watermark.'
                      : 'Không có Proof chờ duyệt.'}
                  </Td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-slate-50">
                    <Td className="font-bold text-slate-800">{r.campaign.title}</Td>
                    <Td className="text-slate-600">{r.publisher.email}</Td>
                    <Td className="space-y-1 text-xs">
                      {r.proofUrl ? (
                        <a
                          href={r.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-brand-blue hover:underline"
                        >
                          Xem file gốc
                        </a>
                      ) : (
                        <span className="text-slate-400">Chưa có file</span>
                      )}
                      <div>
                        {r.watermarkUrl ? (
                          <Badge tone="positive">Đã chèn watermark</Badge>
                        ) : (
                          <Badge tone="warning">Chờ watermark</Badge>
                        )}
                      </div>
                      {r.reviewUrl && (
                        <a
                          href={r.reviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-slate-500 hover:underline"
                        >
                          Bài review
                        </a>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap font-mono text-xs text-slate-500">
                      {new Date(r.createdAt).toLocaleString('vi-VN')}
                    </Td>
                    <Td>
                      {!canDecide ? (
                        <span className="text-xs text-slate-400">Chỉ xem</span>
                      ) : rejectingId === r.id ? (
                        <div className="w-64 space-y-2">
                          <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Lý do từ chối (hiển thị cho Bên B)"
                            maxLength={1000}
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={busyId === r.id || reason.trim().length === 0}
                              onClick={() => decide(r.id, 'REJECT')}
                            >
                              Xác nhận từ chối
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRejectingId(null);
                                setReason('');
                              }}
                            >
                              Huỷ
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="gold"
                            size="sm"
                            disabled={busyId === r.id}
                            onClick={() => decide(r.id, 'APPROVE')}
                          >
                            Duyệt & trả thưởng
                          </Button>
                          <Button
                            variant="danger-ghost"
                            size="sm"
                            disabled={busyId === r.id}
                            onClick={() => setRejectingId(r.id)}
                          >
                            Từ chối
                          </Button>
                        </div>
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </Tbody>
          </Table>
        </div>
      </div>
    </CmsShell>
  );
}
