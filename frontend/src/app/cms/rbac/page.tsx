'use client';

import { useEffect, useState } from 'react';
import { Plus, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { PLATFORM_LABEL } from '@/lib/mock-data';
import { ApiError } from '@/lib/auth-client';
import type { UserRole } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import { deleteUser, listUsers, updateUserRole, type AdminUser } from '@/lib/users-client';
import {
  createPermission,
  deletePermission,
  listPermissions,
  type RolePermission,
} from '@/lib/permissions-client';
import {
  assignModerator,
  listAdminCampaigns,
  type AdminCampaign,
} from '@/lib/admin-campaigns-client';

const ROLE_BADGE: Record<UserRole, BadgeTone> = {
  ROOT_ADMIN: 'critical',
  ADMIN: 'purple',
  MODERATOR: 'info',
  USER: 'neutral',
};

// Vai trò hiển thị trong dropdown đổi role (STAFF_ROLES lọc ai hiện trong
// bảng "Danh Sách Nhân Sự" — chỉ MODERATOR/ADMIN, KHÔNG liệt kê mọi USER
// thường vì không scale; muốn phong Moderator mới dùng ô tìm email riêng).
const EDITABLE_ROLES: UserRole[] = ['USER', 'MODERATOR', 'ADMIN'];
const STAFF_ROLES: UserRole[] = ['MODERATOR', 'ADMIN'];

export default function RbacPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROOT_ADMIN';
  const isRootAdmin = user?.role === 'ROOT_ADMIN';

  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [campaigns, setCampaigns] = useState<AdminCampaign[] | null>(null);
  const [permissions, setPermissions] = useState<RolePermission[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newRoleName, setNewRoleName] = useState('');
  const [newPermissionCode, setNewPermissionCode] = useState('');
  const [promoteQuery, setPromoteQuery] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    Promise.all([listUsers(), listAdminCampaigns(), listPermissions()])
      .then(([u, c, p]) => {
        if (cancelled) return;
        setUsers(u);
        setCampaigns(c);
        setPermissions(p);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu RBAC');
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  async function handleRoleChange(targetId: string, role: UserRole) {
    setError(null);
    try {
      const updated = await updateUserRole(targetId, role);
      setUsers((prev) => prev?.map((u) => (u.id === targetId ? { ...u, ...updated } : u)) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không đổi được vai trò');
    }
  }

  async function handleDelete(targetId: string) {
    setError(null);
    try {
      await deleteUser(targetId);
      setUsers((prev) => prev?.filter((u) => u.id !== targetId) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không xóa được tài khoản');
    }
  }

  async function handleAssignModerator(campaignId: string, moderatorId: string) {
    setError(null);
    try {
      const updated = await assignModerator(campaignId, moderatorId || null);
      setCampaigns((prev) => prev?.map((c) => (c.id === campaignId ? updated : c)) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không phân công được Moderator');
    }
  }

  async function handleCreatePermission(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newRoleName.trim() || !newPermissionCode.trim()) return;
    try {
      const created = await createPermission(newRoleName.trim(), newPermissionCode.trim());
      setPermissions((prev) => (prev ? [...prev, created] : [created]));
      setNewRoleName('');
      setNewPermissionCode('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thêm được quyền hạn');
    }
  }

  async function handleDeletePermission(id: string) {
    setError(null);
    try {
      await deletePermission(id);
      setPermissions((prev) => prev?.filter((p) => p.id !== id) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không xóa được quyền hạn');
    }
  }

  if (!userLoading && !isAdmin) {
    return (
      <CmsShell active="/cms/rbac">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-bold text-slate-800">Không đủ quyền truy cập</p>
          <p className="text-xs text-slate-500">Chỉ Admin hoặc Root Admin được quản lý RBAC.</p>
        </div>
      </CmsShell>
    );
  }

  const rootUser = users?.find((u) => u.isRootAdmin);
  const moderatorsAndAbove = users?.filter((u) => STAFF_ROLES.includes(u.role)) ?? [];
  const promoteMatches =
    promoteQuery.trim().length >= 2
      ? (users ?? [])
          .filter(
            (u) => u.role === 'USER' && u.email.toLowerCase().includes(promoteQuery.toLowerCase()),
          )
          .slice(0, 5)
      : [];

  async function handlePromoteToModerator(targetId: string) {
    await handleRoleChange(targetId, 'MODERATOR');
    setPromoteQuery('');
  }

  return (
    <CmsShell active="/cms/rbac">
      <div className="space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">
            SCR-12: Quản Lý Phân Quyền RBAC &amp; Root Administrator
          </h3>
          <p className="text-xs text-slate-500">
            Mô hình phân cấp: Root Admin → Admin → Super/Moderator → Tài khoản Dịch vụ / Tài khoản
            Người dùng
          </p>
        </div>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        {/* Root Administrator Protected Box */}
        <div className="flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-brand-blue p-4 text-white shadow-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gold text-slate-950">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong className="font-mono text-sm text-amber-300">
                  Root Administrator {rootUser ? `(${rootUser.email})` : ''}
                </strong>
                <span className="rounded border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                  IMMUTABLE / HARDCODED
                </span>
              </div>
              <span className="block text-xs text-slate-300">
                Tài khoản bất biến — không thể bị xóa hay hạ cấp bởi bất kỳ API hay Quản trị viên
                nào khác.
              </span>
            </div>
          </div>
          <span className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-center font-mono text-xs font-bold text-white">
            Toàn quyền hệ thống
          </span>
        </div>

        {/* Staff table */}
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-mono text-xs font-extrabold text-slate-800 uppercase">
              Danh Sách Nhân Sự &amp; Phân Quyền Nội Bộ
            </h4>
            <div className="relative w-64">
              <Input
                value={promoteQuery}
                onChange={(e) => setPromoteQuery(e.target.value)}
                placeholder="Tìm email để phong Moderator..."
              />
              {promoteMatches.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
                  {promoteMatches.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handlePromoteToModerator(u.id)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50"
                    >
                      <span className="text-slate-700">{u.email}</span>
                      <span className="inline-flex items-center gap-1 font-bold text-brand-blue">
                        <Plus className="h-3 w-3" />
                        Moderator
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {!isRootAdmin && (
            <p className="text-[11px] text-slate-500">
              Admin thường chỉ đổi được vai trò giữa Tài khoản thường ↔ Moderator — nâng lên Admin
              hoặc hạ cấp 1 Admin khác cần Root Administrator.
            </p>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Table>
              <Thead>
                <Th>Email</Th>
                <Th>Vai trò (Role)</Th>
                <Th className="text-right">Thao tác</Th>
              </Thead>
              <Tbody>
                {moderatorsAndAbove.map((u) => {
                  const touchesAdmin = u.role === 'ADMIN';
                  const canEdit = !u.isRootAdmin && (isRootAdmin || !touchesAdmin);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <Td className="font-semibold text-slate-800">{u.email}</Td>
                      <Td>
                        {u.isRootAdmin ? (
                          <Badge tone={ROLE_BADGE[u.role]}>{u.role}</Badge>
                        ) : canEdit ? (
                          <Select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="w-40"
                          >
                            {EDITABLE_ROLES.map((r) => (
                              <option key={r} value={r} disabled={r === 'ADMIN' && !isRootAdmin}>
                                {r}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <Badge tone={ROLE_BADGE[u.role]}>{u.role}</Badge>
                        )}
                      </Td>
                      <Td className="text-right">
                        {u.isRootAdmin ? (
                          <span className="text-slate-400 italic">Khóa bảo vệ</span>
                        ) : isRootAdmin ? (
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="inline-flex items-center gap-1 font-bold text-rose-600 hover:underline"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Xóa
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
                {moderatorsAndAbove.length === 0 && (
                  <tr>
                    <Td colSpan={3} className="py-6 text-center text-slate-400">
                      Chưa có nhân sự nào.
                    </Td>
                  </tr>
                )}
              </Tbody>
            </Table>
          </div>
        </div>

        {/* Campaign assignment */}
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="font-mono text-xs font-extrabold text-slate-800 uppercase">
            Phân Công Campaign Cho Moderator
          </h4>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Table>
              <Thead>
                <Th>Campaign</Th>
                <Th>Tài khoản Dịch vụ</Th>
                <Th>Moderator phụ trách</Th>
              </Thead>
              <Tbody>
                {campaigns?.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <Td className="font-bold text-slate-800">
                      {c.title}
                      <span className="ml-1.5 text-[10px] font-normal text-slate-400">
                        {PLATFORM_LABEL[c.platform]}
                      </span>
                    </Td>
                    <Td className="text-slate-600">{c.owner.email}</Td>
                    <Td>
                      <Select
                        value={c.assignedModerator?.id ?? ''}
                        onChange={(e) => handleAssignModerator(c.id, e.target.value)}
                        className="w-56"
                      >
                        <option value="">— Chưa phân công (mọi Mod đều xử lý được) —</option>
                        {users
                          ?.filter((u) => u.role === 'MODERATOR')
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.email}
                            </option>
                          ))}
                      </Select>
                    </Td>
                  </tr>
                ))}
                {campaigns?.length === 0 && (
                  <tr>
                    <Td colSpan={3} className="py-6 text-center text-slate-400">
                      Chưa có Campaign nào.
                    </Td>
                  </tr>
                )}
              </Tbody>
            </Table>
          </div>
        </div>

        {/* RolePermission reference list */}
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="font-mono text-xs font-extrabold text-slate-800 uppercase">
            Quyền Hạn Tham Khảo Theo Vai Trò
          </h4>
          <p className="text-[11px] text-slate-500">
            Danh sách mô tả — không dùng để thực thi phân quyền (enforcement thật nằm ở guard theo 4
            vai trò cố định USER/MODERATOR/ADMIN/ROOT_ADMIN).
          </p>

          <form onSubmit={handleCreatePermission} className="flex flex-wrap items-end gap-2">
            <Field label="Vai trò">
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="MODERATOR"
                className="w-40"
              />
            </Field>
            <Field label="Mã quyền hạn">
              <Input
                value={newPermissionCode}
                onChange={(e) => setNewPermissionCode(e.target.value)}
                placeholder="disputes.recommend"
                className="w-56"
              />
            </Field>
            <Button variant="dark" size="sm" type="submit">
              <Plus className="h-3.5 w-3.5" />
              Thêm
            </Button>
          </form>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Table>
              <Thead>
                <Th>Vai trò</Th>
                <Th>Mã quyền hạn</Th>
                <Th className="text-right">Thao tác</Th>
              </Thead>
              <Tbody>
                {permissions?.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <Td className="font-mono font-bold text-slate-800">{p.roleName}</Td>
                    <Td className="font-mono text-slate-600">{p.permissionCode}</Td>
                    <Td className="text-right">
                      <button
                        onClick={() => handleDeletePermission(p.id)}
                        className="inline-flex items-center gap-1 font-bold text-rose-600 hover:underline"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Td>
                  </tr>
                ))}
                {permissions?.length === 0 && (
                  <tr>
                    <Td colSpan={3} className="py-6 text-center text-slate-400">
                      Chưa có quyền hạn nào được ghi chú.
                    </Td>
                  </tr>
                )}
              </Tbody>
            </Table>
          </div>
        </div>
      </div>
    </CmsShell>
  );
}
