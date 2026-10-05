'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { ShieldAlert, Plus, Save, Trash2 } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { ApiError } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePermissions } from '@/lib/use-permissions';
import { PLATFORM_LABEL } from '@/lib/mock-data';
import {
  assignModerator,
  listAdminCampaigns,
  type AdminCampaign,
} from '@/lib/admin-campaigns-client';
import {
  createGroup,
  deleteGroup,
  getCatalog,
  getRbacUser,
  listGroups,
  listRbacUsers,
  setGroupPermissions,
  setUserGroups,
  setUserOverrides,
  updateGroup,
  type AccessGroup,
  type CatalogResource,
  type OverrideEffect,
  type PermissionAction,
  type RbacUserDetail,
  type RbacUserRow,
} from '@/lib/rbac-client';

const ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'READ', label: 'Xem' },
  { key: 'CREATE', label: 'Tạo' },
  { key: 'UPDATE', label: 'Sửa' },
  { key: 'DELETE', label: 'Xoá' },
  { key: 'APPROVE', label: 'Duyệt' },
];

type Tab = 'groups' | 'users' | 'campaigns';
type OverrideChoice = 'INHERIT' | 'ALLOW' | 'DENY';

const key = (resource: string, action: string) => `${resource}:${action}`;

function groupByArea(catalog: CatalogResource[]) {
  const map = new Map<string, CatalogResource[]>();
  for (const r of catalog) {
    map.set(r.area, [...(map.get(r.area) ?? []), r]);
  }
  return [...map.entries()];
}

// Ma trận tài nguyên × hành động. Ô không áp dụng cho tài nguyên hiển thị "—".
function PermissionMatrix({
  catalog,
  checked,
  onToggle,
  disabled,
}: {
  catalog: CatalogResource[];
  checked: Set<string>;
  onToggle: (resource: string, action: PermissionAction) => void;
  disabled?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-left text-[11px] font-bold text-slate-600 uppercase">
          <tr>
            <th className="px-3 py-2">Chức năng</th>
            {ACTIONS.map((a) => (
              <th key={a.key} className="px-3 py-2 text-center">
                {a.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groupByArea(catalog).map(([area, rows]) => (
            <Fragment key={area}>
              <tr className="bg-slate-100/60">
                <td
                  colSpan={ACTIONS.length + 1}
                  className="px-3 py-1.5 font-mono text-[10px] font-extrabold text-slate-500 uppercase"
                >
                  {area}
                </td>
              </tr>
              {rows.map((r) => (
                <tr key={r.resource} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-bold text-slate-800">{r.label}</td>
                  {ACTIONS.map((a) => {
                    const applicable = (r.actions as string[]).includes(a.key);
                    if (!applicable) {
                      return (
                        <td key={a.key} className="px-3 py-2 text-center text-slate-300">
                          —
                        </td>
                      );
                    }
                    return (
                      <td key={a.key} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${r.label} — ${a.label}`}
                          disabled={disabled}
                          checked={checked.has(key(r.resource, a.key))}
                          onChange={() => onToggle(r.resource, a.key)}
                          className="h-4 w-4 accent-brand-blue"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Ma trận override riêng user: mỗi ô chọn Theo nhóm / Cho phép / Cấm.
function OverrideMatrix({
  catalog,
  values,
  onChange,
  disabled,
}: {
  catalog: CatalogResource[];
  values: Record<string, OverrideChoice>;
  onChange: (resource: string, action: PermissionAction, value: OverrideChoice) => void;
  disabled?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-left text-[11px] font-bold text-slate-600 uppercase">
          <tr>
            <th className="px-3 py-2">Chức năng · hành động</th>
            <th className="px-3 py-2">Quyền riêng</th>
          </tr>
        </thead>
        <tbody>
          {catalog.flatMap((r) =>
            r.actions.map((a) => {
              const k = key(r.resource, a);
              return (
                <tr key={k} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 text-slate-800">
                    <span className="font-bold">{r.label}</span>
                    <span className="ml-2 text-slate-400">
                      · {ACTIONS.find((x) => x.key === a)?.label}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    <Select
                      value={values[k] ?? 'INHERIT'}
                      disabled={disabled}
                      onChange={(e) => onChange(r.resource, a, e.target.value as OverrideChoice)}
                      className="w-44 py-1"
                    >
                      <option value="INHERIT">Theo nhóm</option>
                      <option value="ALLOW">Cho phép</option>
                      <option value="DENY">Cấm</option>
                    </Select>
                  </td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function CmsRbacPage() {
  const { loading: userLoading } = useCurrentUser();
  const perms = usePermissions();
  const canRead = perms.can('rbac', 'READ');
  const canManage = perms.can('rbac', 'UPDATE');
  const canCreate = perms.can('rbac', 'CREATE');
  const canDelete = perms.can('rbac', 'DELETE');

  const [tab, setTab] = useState<Tab>('groups');
  const [catalog, setCatalog] = useState<CatalogResource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // --- Nhóm quyền ---
  const [groups, setGroups] = useState<AccessGroup[] | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [draftChecked, setDraftChecked] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);

  // --- Người dùng ---
  const [userQuery, setUserQuery] = useState('');
  const [users, setUsers] = useState<RbacUserRow[] | null>(null);
  const [selectedUser, setSelectedUser] = useState<RbacUserDetail | null>(null);
  const [userGroupIds, setUserGroupIds] = useState<Set<string>>(new Set());
  const [overrideValues, setOverrideValues] = useState<Record<string, OverrideChoice>>({});
  const [savingUser, setSavingUser] = useState(false);

  // --- Campaign ---
  const [campaigns, setCampaigns] = useState<AdminCampaign[] | null>(null);
  const [staffPerms, setStaffPerms] = useState<Record<string, Set<string>>>({});
  const [staff, setStaff] = useState<RbacUserRow[]>([]);

  const selectedGroup = useMemo(
    () => groups?.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    Promise.all([getCatalog(), listGroups()])
      .then(([cat, gs]) => {
        if (cancelled) return;
        setCatalog(cat);
        setGroups(gs);
        setSelectedGroupId((prev) => prev ?? gs[0]?.id ?? null);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : 'Không tải được nhóm quyền');
      });
    return () => {
      cancelled = true;
    };
  }, [canRead]);

  // Nạp lại nháp khi đổi sang nhóm khác (cập nhật state khi render, không dùng effect).
  const [draftFor, setDraftFor] = useState<string | null>(null);
  if (selectedGroup && draftFor !== selectedGroup.id) {
    setDraftFor(selectedGroup.id);
    setGroupName(selectedGroup.name);
    setGroupDescription(selectedGroup.description ?? '');
    setDraftChecked(new Set(selectedGroup.permissions.map((p) => key(p.resource, p.action))));
  }

  useEffect(() => {
    if (tab !== 'users' || !canRead) return;
    let cancelled = false;
    listRbacUsers({ q: userQuery || undefined, pageSize: 50 })
      .then((res) => {
        if (!cancelled) setUsers(res.items);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : 'Không tải được người dùng');
      });
    return () => {
      cancelled = true;
    };
  }, [tab, userQuery, canRead]);

  useEffect(() => {
    if (tab !== 'campaigns' || !canRead) return;
    let cancelled = false;
    listAdminCampaigns()
      .then(async (cs) => {
        if (cancelled) return;
        setCampaigns(cs);
        // Lấy quyền của các staff để cảnh báo moderator chưa có quyền Campaign.
        const staff = await listRbacUsers({ pageSize: 100 });
        const candidates = staff.items.filter((u) => u.role === 'MODERATOR' || u.role === 'ADMIN');
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
  }, [tab, canRead]);

  function flash(message: string) {
    setInfo(message);
    setTimeout(() => setInfo(null), 2500);
  }

  async function reloadGroups() {
    setGroups(await listGroups());
  }

  async function handleCreateGroup() {
    setError(null);
    if (newGroupName.trim().length < 2) {
      setError('Tên nhóm phải có ít nhất 2 ký tự');
      return;
    }
    try {
      const created = await createGroup({ name: newGroupName.trim(), permissions: [] });
      setNewGroupName('');
      await reloadGroups();
      setSelectedGroupId(created.id);
      flash('Đã tạo nhóm. Chọn quyền bên dưới rồi bấm Lưu.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tạo được nhóm');
    }
  }

  async function handleSaveGroup() {
    if (!selectedGroup) return;
    setSavingGroup(true);
    setError(null);
    try {
      if (
        groupName.trim() !== selectedGroup.name ||
        groupDescription !== (selectedGroup.description ?? '')
      ) {
        await updateGroup(selectedGroup.id, {
          name: groupName.trim(),
          description: groupDescription,
        });
      }
      const permissions = [...draftChecked].map((k) => {
        const [resource, action] = k.split(':');
        return { resource: resource!, action: action as PermissionAction };
      });
      await setGroupPermissions(selectedGroup.id, permissions);
      await reloadGroups();
      flash('Đã lưu quyền của nhóm.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được nhóm');
    } finally {
      setSavingGroup(false);
    }
  }

  async function handleDeleteGroup(group: AccessGroup) {
    if (!window.confirm(`Xoá nhóm "${group.name}"? Thành viên sẽ mất quyền của nhóm này.`)) return;
    setError(null);
    try {
      await deleteGroup(group.id);
      setSelectedGroupId(null);
      await reloadGroups();
      flash('Đã xoá nhóm.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không xoá được nhóm');
    }
  }

  async function openUser(row: RbacUserRow) {
    await loadUser(row.id);
  }

  async function loadUser(id: string) {
    setError(null);
    try {
      const detail = await getRbacUser(id);
      setSelectedUser(detail);
      setUserGroupIds(new Set(detail.groups.filter((g) => !g.linkedRole).map((g) => g.id)));
      const values: Record<string, OverrideChoice> = {};
      for (const o of detail.overrides) values[key(o.resource, o.action)] = o.effect;
      setOverrideValues(values);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được người dùng');
    }
  }

  // Quyền chỉnh sửa người dùng: Root không ai chỉnh; Admin thường không chỉnh Admin khác.
  const userLocked = !selectedUser
    ? true
    : selectedUser.isRoot || (selectedUser.role === 'ADMIN' && !perms.isRoot);

  async function handleSaveUserGroups() {
    if (!selectedUser) return;
    setSavingUser(true);
    setError(null);
    try {
      await setUserGroups(selectedUser.id, [...userGroupIds]);
      await loadUser(selectedUser.id);
      flash('Đã lưu nhóm của người dùng.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được nhóm');
    } finally {
      setSavingUser(false);
    }
  }

  async function handleSaveOverrides() {
    if (!selectedUser || !catalog.length) return;
    setSavingUser(true);
    setError(null);
    try {
      const entries = catalog.flatMap((r) =>
        r.actions.map((a) => {
          const choice = overrideValues[key(r.resource, a)] ?? 'INHERIT';
          const effect: OverrideEffect | null = choice === 'INHERIT' ? null : choice;
          return { resource: r.resource, action: a, effect };
        }),
      );
      await setUserOverrides(selectedUser.id, entries);
      await loadUser(selectedUser.id);
      flash('Đã lưu quyền riêng của người dùng.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được quyền riêng');
    } finally {
      setSavingUser(false);
    }
  }

  async function handleAssign(campaignId: string, moderatorId: string) {
    setError(null);
    try {
      const updated = await assignModerator(campaignId, moderatorId || null);
      setCampaigns((prev) => prev?.map((c) => (c.id === campaignId ? updated : c)) ?? null);
    } catch (err) {
      // Lỗi nghiệp vụ (vd. moderator chưa có quyền Quản trị Campaign) hiển thị nguyên văn từ backend.
      setError(err instanceof ApiError ? err.message : 'Không phân công được Moderator');
    }
  }

  if (!userLoading && !perms.loading && !canRead) {
    return (
      <CmsShell active="/cms/rbac">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-bold text-slate-800">Không đủ quyền truy cập</p>
          <p className="text-xs text-slate-500">
            Cần quyền &ldquo;Phân quyền &amp; nhóm quyền&rdquo; để xem trang này.
          </p>
        </div>
      </CmsShell>
    );
  }

  return (
    <CmsShell active="/cms/rbac">
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">
            Phân Quyền & Nhóm Quyền (SCR-12)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Phân quyền theo <strong>nhóm</strong> (vd. Moderator, Supermoderator) và theo từng chức
            năng — mỗi chức năng có Xem / Tạo / Sửa / Xoá / Duyệt. Có thể cấp{' '}
            <strong>quyền riêng</strong> cho từng người, ưu tiên hơn quyền của nhóm. Root
            Administrator luôn có toàn quyền.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['groups', 'Nhóm quyền'],
              ['users', 'Người dùng & quyền riêng'],
              ['campaigns', 'Phân công Campaign'],
            ] as [Tab, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                tab === k
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
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

        {tab === 'groups' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="font-mono text-xs font-extrabold text-slate-700 uppercase">
                Danh sách nhóm
              </h4>
              {groups === null ? (
                <p className="py-4 text-center text-xs text-slate-400">Đang tải...</p>
              ) : (
                <ul className="space-y-1.5">
                  {groups.map((g) => (
                    <li key={g.id}>
                      <button
                        onClick={() => setSelectedGroupId(g.id)}
                        className={`w-full rounded-xl border p-2.5 text-left text-xs transition ${
                          g.id === selectedGroupId
                            ? 'border-brand-blue bg-blue-50'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-800">{g.name}</span>
                          <Badge tone={g.isSystem ? 'info' : 'purple'}>
                            {g.isSystem ? 'Hệ thống' : 'Tự tạo'}
                          </Badge>
                        </div>
                        <div className="mt-1 text-[10px] text-slate-500">
                          {g.memberCount} thành viên · {g.permissions.length} quyền
                          {g.linkedRole && <> · gắn role {g.linkedRole}</>}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {canCreate && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <Field label="Nhóm mới">
                    <Input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="vd. Supermoderator"
                    />
                  </Field>
                  <Button variant="dark" size="sm" className="w-full" onClick={handleCreateGroup}>
                    <Plus className="h-3.5 w-3.5" />
                    Tạo nhóm
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              {!selectedGroup ? (
                <p className="py-10 text-center text-xs text-slate-400">
                  Chọn một nhóm để xem và chỉnh quyền.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label="Tên nhóm">
                      <Input
                        value={groupName}
                        disabled={!canManage}
                        onChange={(e) => setGroupName(e.target.value)}
                      />
                    </Field>
                    <Field label="Mô tả">
                      <Input
                        value={groupDescription}
                        disabled={!canManage}
                        onChange={(e) => setGroupDescription(e.target.value)}
                      />
                    </Field>
                  </div>
                  {selectedGroup.linkedRole && (
                    <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-900">
                      Nhóm này gắn với role <strong>{selectedGroup.linkedRole}</strong>: mọi tài
                      khoản có role này tự động có các quyền dưới đây. Có thể chỉnh quyền, nhưng
                      nhóm không xoá được.
                    </p>
                  )}
                  <PermissionMatrix
                    catalog={catalog}
                    checked={draftChecked}
                    disabled={!canManage}
                    onToggle={(r, a) =>
                      setDraftChecked((prev) => {
                        const next = new Set(prev);
                        const k = key(r, a);
                        if (next.has(k)) next.delete(k);
                        else next.add(k);
                        return next;
                      })
                    }
                  />
                  <div className="flex flex-wrap justify-between gap-2">
                    {canDelete && !selectedGroup.isSystem ? (
                      <Button
                        variant="danger-ghost"
                        size="sm"
                        onClick={() => handleDeleteGroup(selectedGroup)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xoá nhóm
                      </Button>
                    ) : (
                      <span />
                    )}
                    {canManage && (
                      <Button variant="dark" disabled={savingGroup} onClick={handleSaveGroup}>
                        <Save className="h-4 w-4" />
                        {savingGroup ? 'Đang lưu...' : 'Lưu quyền nhóm'}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <Field label="Tìm theo email">
                <Input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="email@..."
                />
              </Field>
              <div className="max-h-[560px] overflow-auto rounded-xl border border-slate-200">
                <Table>
                  <Thead>
                    <Th>Tài khoản</Th>
                    <Th>Role</Th>
                    <Th>Nhóm</Th>
                    <Th>Quyền riêng</Th>
                  </Thead>
                  <Tbody>
                    {(users ?? []).map((u) => (
                      <tr
                        key={u.id}
                        onClick={() => openUser(u)}
                        className={`cursor-pointer hover:bg-slate-50 ${selectedUser?.id === u.id ? 'bg-blue-50' : ''}`}
                      >
                        <Td className="font-bold text-slate-800">
                          {u.email}
                          {u.isRoot && (
                            <Badge tone="critical" className="ml-1.5">
                              Root
                            </Badge>
                          )}
                        </Td>
                        <Td className="font-mono text-[11px]">{u.role}</Td>
                        <Td className="text-[11px] text-slate-600">
                          {u.groups.length ? u.groups.map((g) => g.name).join(', ') : '—'}
                        </Td>
                        <Td className="text-center">{u.overrideCount || '—'}</Td>
                      </tr>
                    ))}
                  </Tbody>
                </Table>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
              {!selectedUser ? (
                <p className="py-10 text-center text-xs text-slate-400">
                  Chọn một tài khoản để phân nhóm và quyền riêng.
                </p>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">{selectedUser.email}</p>
                    <p className="text-[11px] text-slate-500">Role: {selectedUser.role}</p>
                  </div>
                  {selectedUser.isRoot && (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">
                      Root Administrator có toàn quyền và không ai chỉnh được quyền của Root.
                    </p>
                  )}
                  {!selectedUser.isRoot && selectedUser.role === 'ADMIN' && (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                      Quyền của Quản trị viên chỉ Root Administrator được chỉnh.
                    </p>
                  )}

                  <div className="space-y-2">
                    <h4 className="font-mono text-xs font-extrabold text-slate-700 uppercase">
                      1. Nhóm quyền
                    </h4>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {(groups ?? [])
                        .filter((g) => !g.linkedRole)
                        .map((g) => (
                          <label
                            key={g.id}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                          >
                            <input
                              type="checkbox"
                              disabled={userLocked || !canManage}
                              checked={userGroupIds.has(g.id)}
                              onChange={() =>
                                setUserGroupIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(g.id)) next.delete(g.id);
                                  else next.add(g.id);
                                  return next;
                                })
                              }
                              className="h-4 w-4 accent-brand-blue"
                            />
                            <span className="font-bold text-slate-800">{g.name}</span>
                          </label>
                        ))}
                    </div>
                    {!userLocked && canManage && (
                      <Button
                        variant="dark"
                        size="sm"
                        disabled={savingUser}
                        onClick={handleSaveUserGroups}
                      >
                        Lưu nhóm
                      </Button>
                    )}
                    {selectedUser.groups.some((g) => g.linkedRole) && (
                      <p className="text-[10px] text-slate-500">
                        Tự động theo role:{' '}
                        {selectedUser.groups
                          .filter((g) => g.linkedRole)
                          .map((g) => g.name)
                          .join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-mono text-xs font-extrabold text-slate-700 uppercase">
                      2. Quyền riêng (ưu tiên hơn nhóm)
                    </h4>
                    <OverrideMatrix
                      catalog={catalog}
                      values={overrideValues}
                      disabled={userLocked || !canManage}
                      onChange={(r, a, v) =>
                        setOverrideValues((prev) => ({ ...prev, [key(r, a)]: v }))
                      }
                    />
                    {!userLocked && canManage && (
                      <Button
                        variant="dark"
                        size="sm"
                        disabled={savingUser}
                        onClick={handleSaveOverrides}
                      >
                        Lưu quyền riêng
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-mono text-xs font-extrabold text-slate-700 uppercase">
                      3. Quyền hiệu lực
                    </h4>
                    {selectedUser.effective.includes('*') ? (
                      <p className="text-xs text-slate-600">Toàn quyền (Root Administrator).</p>
                    ) : selectedUser.effective.length === 0 ? (
                      <p className="text-xs text-slate-400">Không có quyền quản trị nào.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {selectedUser.effective.map((k) => (
                          <span
                            key={k}
                            className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-700"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {tab === 'campaigns' && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">
              Moderator được phân công phải có quyền <strong>Quản trị Campaign</strong> (Sửa). Nếu
              chưa có, hệ thống báo lỗi — hãy cấp quyền ở tab Người dùng & quyền riêng trước.
            </p>
            <div className="overflow-hidden rounded-xl border border-slate-200">
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
                          disabled={!canManage}
                          onChange={(e) => handleAssign(c.id, e.target.value)}
                          className="w-72"
                        >
                          <option value="">— Chưa phân công (mọi Mod đều xử lý được) —</option>
                          {staff.map((m) => {
                            const can = staffPerms[m.id]?.has('campaigns:UPDATE');
                            return (
                              <option key={m.id} value={m.id}>
                                {m.email}
                                {staffPerms[m.id] && !can ? ' (thiếu quyền Quản trị Campaign)' : ''}
                              </option>
                            );
                          })}
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
        )}
      </div>
    </CmsShell>
  );
}
