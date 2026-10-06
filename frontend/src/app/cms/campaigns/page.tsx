'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge } from '@/components/ui/Badge';
import { Field, Input, Select } from '@/components/ui/Input';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { PLATFORM_LABEL } from '@/lib/mock-data';
import { ApiError } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePermissions } from '@/lib/use-permissions';
import {
  assignModerator,
  listAdminCampaigns,
  type AdminCampaign,
} from '@/lib/admin-campaigns-client';
import { getRbacUser, listRbacUsers, type RbacUserRow } from '@/lib/rbac-client';

// Quản trị Campaign (SCR-05 phía Admin): xem toàn bộ Campaign, phân công Moderator phụ trách.
// Phân công yêu cầu moderator có quyền "Quản trị Campaign" (campaigns:UPDATE) — backend kiểm tra.
export default function CmsCampaignsPage() {
  const { loading: userLoading } = useCurrentUser();
  const perms = usePermissions();
  const canRead = perms.can('campaigns', 'READ');
  const canAssign = perms.can('campaigns', 'UPDATE');

  const [campaigns, setCampaigns] = useState<AdminCampaign[] | null>(null);
  const [staff, setStaff] = useState<RbacUserRow[]>([]);
  const [staffPerms, setStaffPerms] = useState<Record<string, Set<string>>>({});
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | AdminCampaign['status']>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    Promise.all([listAdminCampaigns(), listRbacUsers({ pageSize: 100 })])
      .then(async ([cs, users]) => {
        if (cancelled) return;
        setCampaigns(cs);
        const candidates = users.items.filter((u) => u.role === 'MODERATOR' || u.role === 'ADMIN');
        setStaff(candidates);
        const details = await Promise.all(
          candidates.map((u) => getRbacUser(u.id).catch(() => null)),
        );
        if (cancelled) return;
        const map: Record<string, Set<string>> = {};
        details.forEach((d) => {
          if (d) map[d.id] = new Set(d.effective);
        });
        setStaffPerms(map);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Không tải được Campaign');
      });
    return () => {
      cancelled = true;
    };
  }, [canRead]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (campaigns ?? []).filter(
      (c) =>
        (status === 'ALL' || c.status === status) &&
        (!q || c.title.toLowerCase().includes(q) || c.owner.email.toLowerCase().includes(q)),
    );
  }, [campaigns, query, status]);

  async function handleAssign(campaignId: string, moderatorId: string) {
    setError(null);
    try {
      const updated = await assignModerator(campaignId, moderatorId || null);
      setCampaigns((prev) => prev?.map((c) => (c.id === campaignId ? updated : c)) ?? null);
      setInfo('Đã cập nhật Moderator phụ trách.');
      setTimeout(() => setInfo(null), 2500);
    } catch (err) {
      // Lỗi nghiệp vụ (vd. moderator chưa có quyền Quản trị Campaign) hiển thị nguyên văn từ backend.
      setError(err instanceof ApiError ? err.message : 'Không phân công được Moderator');
    }
  }

  if (!userLoading && !perms.loading && !canRead) {
    return (
      <CmsShell active="/cms/campaigns">
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
    <CmsShell active="/cms/campaigns">
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">Quản Trị Campaign</h3>
          <p className="mt-1 text-xs text-slate-500">
            Xem toàn bộ Campaign và phân công Moderator phụ trách. Moderator được phân công phải có
            quyền <strong>Quản trị Campaign</strong>; nếu thiếu, hãy cấp quyền ở màn hình Phân quyền
            trước.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Tìm theo tiêu đề hoặc chủ sở hữu">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm..." />
          </Field>
          <Field label="Trạng thái">
            <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="ARCHIVED">Đã lưu trữ</option>
            </Select>
          </Field>
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
              <Th>Tài khoản Dịch vụ</Th>
              <Th>Slot · Thưởng</Th>
              <Th>Trạng thái</Th>
              <Th>Moderator phụ trách</Th>
            </Thead>
            <Tbody>
              {campaigns === null ? (
                <tr>
                  <Td colSpan={5} className="py-6 text-center text-slate-400">
                    Đang tải...
                  </Td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <Td colSpan={5} className="py-6 text-center text-slate-400">
                    Không có Campaign nào.
                  </Td>
                </tr>
              ) : (
                visible.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <Td className="font-bold text-slate-800">
                      {c.title}
                      <span className="ml-1.5 text-[10px] font-normal text-slate-400">
                        {PLATFORM_LABEL[c.platform]}
                      </span>
                    </Td>
                    <Td className="text-slate-600">{c.owner.email}</Td>
                    <Td className="font-mono text-xs">
                      {c.totalSlots} slot · {Number(c.rewardPerSlot).toLocaleString('vi-VN')} KP
                    </Td>
                    <Td>
                      <Badge tone={c.status === 'ACTIVE' ? 'positive' : 'neutral'}>
                        {c.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã lưu trữ'}
                      </Badge>
                    </Td>
                    <Td>
                      <Select
                        value={c.assignedModerator?.id ?? ''}
                        disabled={!canAssign}
                        onChange={(e) => handleAssign(c.id, e.target.value)}
                        className="w-72"
                      >
                        <option value="">— Chưa phân công (mọi Mod đều xử lý được) —</option>
                        {staff.map((m) => {
                          const ok = staffPerms[m.id]?.has('campaigns:UPDATE');
                          return (
                            <option key={m.id} value={m.id}>
                              {m.email}
                              {staffPerms[m.id] && !ok ? ' (thiếu quyền Quản trị Campaign)' : ''}
                            </option>
                          );
                        })}
                      </Select>
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
