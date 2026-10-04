'use client';

import { useEffect, useState } from 'react';
import { Plus, Power, ShieldAlert, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { ApiError } from '@/lib/auth-client';
import type { UserRole } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import {
  createAccount,
  deleteUser,
  listUsers,
  setAccountActive,
  updateAccountProfile,
  updateUserRole,
  type AdminUser,
} from '@/lib/users-client';
import {
  adjustTrustScore,
  getTrustScoreHistory,
  listTrustScoreRules,
  type TrustScoreRule,
  type TrustScoreTransaction,
} from '@/lib/trust-score-client';

const ROLE_BADGE: Record<UserRole, BadgeTone> = {
  ROOT_ADMIN: 'critical',
  ADMIN: 'purple',
  MODERATOR: 'info',
  USER: 'neutral',
};

const EDITABLE_ROLES: UserRole[] = ['USER', 'MODERATOR', 'ADMIN'];

export default function AccountsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROOT_ADMIN';
  const isRootAdmin = user?.role === 'ROOT_ADMIN';

  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    role: 'USER' as UserRole,
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [profileTarget, setProfileTarget] = useState<AdminUser | null>(null);
  const [profileForm, setProfileForm] = useState({ email: '', password: '' });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [trustTarget, setTrustTarget] = useState<AdminUser | null>(null);
  const [trustRules, setTrustRules] = useState<TrustScoreRule[]>([]);
  const [trustHistory, setTrustHistory] = useState<TrustScoreTransaction[] | null>(null);
  const [trustForm, setTrustForm] = useState({ delta: '', ruleCode: '', note: '' });
  const [trustError, setTrustError] = useState<string | null>(null);
  const [trustSaving, setTrustSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    listUsers()
      .then((u) => {
        if (!cancelled) {
          setUsers(u);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Không tải được danh sách tài khoản');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, reloadTick]);

  function refresh() {
    setReloadTick((t) => t + 1);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (!createForm.email || createForm.password.length < 8) {
      setCreateError('Email bắt buộc, mật khẩu phải có ít nhất 8 ký tự');
      return;
    }
    setCreating(true);
    try {
      await createAccount(createForm);
      setCreateOpen(false);
      setCreateForm({ email: '', password: '', role: 'USER' });
      refresh();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Không tạo được tài khoản');
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(targetId: string, role: UserRole) {
    setError(null);
    try {
      await updateUserRole(targetId, role);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không đổi được vai trò');
    }
  }

  async function handleToggleActive(u: AdminUser) {
    setError(null);
    try {
      await setAccountActive(u.id, Boolean(u.disabledAt));
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không đổi được trạng thái tài khoản');
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteUser(id);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không xóa được tài khoản');
    }
  }

  function openProfileModal(u: AdminUser) {
    setProfileTarget(u);
    setProfileForm({ email: u.email, password: '' });
    setProfileError(null);
  }

  async function handleSaveProfile() {
    if (!profileTarget) return;
    setProfileError(null);
    if (!profileForm.email && !profileForm.password) {
      setProfileError('Cần nhập ít nhất email hoặc mật khẩu mới');
      return;
    }
    if (profileForm.password && profileForm.password.length < 8) {
      setProfileError('Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }
    setProfileSaving(true);
    try {
      await updateAccountProfile(profileTarget.id, {
        email: profileForm.email !== profileTarget.email ? profileForm.email : undefined,
        password: profileForm.password || undefined,
      });
      setProfileTarget(null);
      refresh();
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Không lưu được hồ sơ');
    } finally {
      setProfileSaving(false);
    }
  }

  function openTrustModal(u: AdminUser) {
    setTrustTarget(u);
    setTrustForm({ delta: '', ruleCode: '', note: '' });
    setTrustError(null);
    setTrustHistory(null);
    Promise.all([listTrustScoreRules(), getTrustScoreHistory(u.id)])
      .then(([rules, history]) => {
        setTrustRules(rules);
        setTrustHistory(history);
      })
      .catch((err) => {
        setTrustError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu Trust Score');
      });
  }

  async function handleAdjustTrust() {
    if (!trustTarget) return;
    setTrustError(null);
    const delta = Number(trustForm.delta);
    if (!Number.isInteger(delta) || delta === 0) {
      setTrustError('Số điểm phải là số nguyên khác 0');
      return;
    }
    setTrustSaving(true);
    try {
      await adjustTrustScore(trustTarget.id, {
        delta,
        ruleCode: trustForm.ruleCode || undefined,
        note: trustForm.note || undefined,
      });
      setTrustTarget(null);
      refresh();
    } catch (err) {
      setTrustError(err instanceof ApiError ? err.message : 'Không điều chỉnh được điểm');
    } finally {
      setTrustSaving(false);
    }
  }

  if (!userLoading && !isAdmin) {
    return (
      <CmsShell active="/cms/accounts">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-bold text-slate-800">Không đủ quyền truy cập</p>
          <p className="text-xs text-slate-500">
            Chỉ Admin hoặc Root Admin được quản trị tài khoản.
          </p>
        </div>
      </CmsShell>
    );
  }

  const filtered = (users ?? []).filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <CmsShell active="/cms/accounts">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Quản Trị Tài Khoản</h3>
            <p className="mt-1 text-xs text-slate-500">
              CRUD đầy đủ mọi tài khoản + kích hoạt/vô hiệu hoá. Root Administrator chỉ tự chỉnh
              được chính mình — không ai khác (kể cả Admin khác) sửa hay vô hiệu hoá được Root.
            </p>
          </div>
          <Button variant="gold" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Tạo Tài Khoản Mới
          </Button>
        </div>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo email..."
          className="max-w-sm"
        />

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        {users === null ? (
          <p className="py-6 text-center text-xs text-slate-500">Đang tải...</p>
        ) : (
          <Table>
            <Thead>
              <Th>Email</Th>
              <Th>Vai trò</Th>
              <Th className="text-right">Trust Score</Th>
              <Th>Trạng thái</Th>
              <Th>Ngày tạo</Th>
              <Th className="text-right">Thao tác</Th>
            </Thead>
            <Tbody>
              {filtered.map((u) => {
                const touchesAdmin = u.role === 'ADMIN';
                const canEditRole = !u.isRootAdmin && (isRootAdmin || !touchesAdmin);
                const canEditProfile = !u.isRootAdmin || isRootAdmin;
                const canToggleActive = !u.isRootAdmin;
                const canDelete = isRootAdmin && !u.isRootAdmin;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <Td className="font-bold text-slate-800">{u.email}</Td>
                    <Td>
                      {u.isRootAdmin || !canEditRole ? (
                        <Badge tone={ROLE_BADGE[u.role]}>{u.role}</Badge>
                      ) : (
                        <Select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="w-36"
                        >
                          {EDITABLE_ROLES.map((r) => (
                            <option key={r} value={r} disabled={r === 'ADMIN' && !isRootAdmin}>
                              {r}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Td>
                    <Td className="text-right font-mono font-bold text-brand-blue">
                      {u.trustScore}
                    </Td>
                    <Td>
                      {u.disabledAt ? (
                        <Badge tone="critical">Đã vô hiệu hoá</Badge>
                      ) : (
                        <Badge tone="positive">Đang hoạt động</Badge>
                      )}
                    </Td>
                    <Td className="text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {u.role === 'USER' && (
                          <button
                            onClick={() => openTrustModal(u)}
                            title="Điều chỉnh Trust Score"
                            className="rounded-lg border border-blue-200 bg-blue-50 p-1.5 text-brand-blue hover:bg-blue-100"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canEditProfile && (
                          <button
                            onClick={() => openProfileModal(u)}
                            title="Sửa hồ sơ (email/mật khẩu)"
                            className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:bg-slate-100"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canToggleActive && (
                          <button
                            onClick={() => handleToggleActive(u)}
                            title={u.disabledAt ? 'Kích hoạt lại' : 'Vô hiệu hoá'}
                            className={`rounded-lg border p-1.5 ${
                              u.disabledAt
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            title="Xóa tài khoản"
                            className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {u.isRootAdmin && (
                          <span className="self-center text-[11px] text-slate-400 italic">
                            Khóa bảo vệ
                          </span>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <Td colSpan={6} className="py-6 text-center text-slate-400">
                    Không tìm thấy tài khoản nào.
                  </Td>
                </tr>
              )}
            </Tbody>
          </Table>
        )}
      </div>

      {/* Tạo tài khoản mới */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo Tài Khoản Mới"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button variant="gold" size="sm" onClick={handleCreate} disabled={creating}>
              {creating ? 'Đang tạo...' : 'Tạo Tài Khoản'}
            </Button>
          </>
        }
      >
        <form className="space-y-3 text-xs" onSubmit={handleCreate}>
          {createError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
              {createError}
            </p>
          )}
          <Field label="Email">
            <Input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="user@kplatform.dev"
            />
          </Field>
          <Field label="Mật khẩu (ít nhất 8 ký tự)">
            <Input
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
            />
          </Field>
          <Field label="Vai trò">
            <Select
              value={createForm.role}
              onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            >
              <option value="USER">USER</option>
              <option value="MODERATOR">MODERATOR</option>
              {isRootAdmin && <option value="ADMIN">ADMIN</option>}
            </Select>
          </Field>
        </form>
      </Modal>

      {/* Sửa hồ sơ */}
      <Modal
        open={Boolean(profileTarget)}
        onClose={() => setProfileTarget(null)}
        title={`Sửa Hồ Sơ — ${profileTarget?.email ?? ''}`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setProfileTarget(null)}>
              Hủy
            </Button>
            <Button variant="dark" size="sm" onClick={handleSaveProfile} disabled={profileSaving}>
              {profileSaving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          {profileError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
              {profileError}
            </p>
          )}
          <Field label="Email">
            <Input
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>
          <Field label="Mật khẩu mới (để trống nếu không đổi)">
            <Input
              type="password"
              value={profileForm.password}
              onChange={(e) => setProfileForm((f) => ({ ...f, password: e.target.value }))}
            />
          </Field>
        </div>
      </Modal>

      {/* Điều chỉnh Trust Score */}
      <Modal
        open={Boolean(trustTarget)}
        onClose={() => setTrustTarget(null)}
        eyebrow="B-05"
        title={`Trust Score — ${trustTarget?.email ?? ''}`}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setTrustTarget(null)}>
              Đóng
            </Button>
            <Button variant="dark" size="sm" onClick={handleAdjustTrust} disabled={trustSaving}>
              {trustSaving ? 'Đang lưu...' : 'Áp Dụng'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            Điểm hiện tại:{' '}
            <strong className="font-mono text-brand-blue">{trustTarget?.trustScore}</strong> (không
            giới hạn trần, có thể âm).
          </p>
          {trustError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
              {trustError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số điểm (+/-)">
              <Input
                type="number"
                value={trustForm.delta}
                onChange={(e) => setTrustForm((f) => ({ ...f, delta: e.target.value }))}
                placeholder="vd. 10 hoặc -10"
              />
            </Field>
            <Field label="Lý do có sẵn (tuỳ chọn)">
              <Select
                value={trustForm.ruleCode}
                onChange={(e) => setTrustForm((f) => ({ ...f, ruleCode: e.target.value }))}
              >
                <option value="">— Tự nhập lý do —</option>
                {trustRules.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label} ({r.points > 0 ? '+' : ''}
                    {r.points})
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Ghi chú">
            <Input
              value={trustForm.note}
              onChange={(e) => setTrustForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Lý do điều chỉnh..."
            />
          </Field>

          <div className="space-y-1.5 border-t border-slate-100 pt-3">
            <h5 className="text-[11px] font-bold text-slate-500 uppercase">Lịch Sử Gần Đây</h5>
            {!trustHistory || trustHistory.length === 0 ? (
              <p className="text-[11px] text-slate-400">Chưa có lịch sử.</p>
            ) : (
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {trustHistory.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1"
                  >
                    <span className="text-slate-600">
                      {h.ruleCode ?? h.note ?? 'Điều chỉnh'}
                      {h.actor && ` — ${h.actor.email}`}
                    </span>
                    <span
                      className={`font-mono font-bold ${h.delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      {h.delta > 0 ? '+' : ''}
                      {h.delta}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </CmsShell>
  );
}
