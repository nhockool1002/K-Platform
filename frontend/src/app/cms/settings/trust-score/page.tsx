'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { ApiError } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import {
  createTrustScoreRule,
  deleteTrustScoreRule,
  listTrustScoreRules,
  updateTrustScoreRule,
  type TrustScoreRule,
} from '@/lib/trust-score-client';

interface RuleForm {
  code: string;
  label: string;
  points: number;
}

const EMPTY_FORM: RuleForm = { code: '', label: '', points: 5 };
const CODE_PATTERN = /^[A-Z0-9_]+$/;

export default function CmsTrustScoreRulesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROOT_ADMIN';

  const [rules, setRules] = useState<TrustScoreRule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [editing, setEditing] = useState<TrustScoreRule | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    listTrustScoreRules()
      .then((rows) => {
        if (cancelled) return;
        setRules(rows);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Không tải được lý do Trust Score');
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, reloadTick]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(rule: TrustScoreRule) {
    setEditing(rule);
    setForm({ code: rule.code, label: rule.label, points: rule.points });
    setModalOpen(true);
  }

  async function handleSave() {
    setError(null);
    if (!form.label.trim()) {
      setError('Vui lòng nhập tên lý do');
      return;
    }
    if (!Number.isInteger(form.points) || form.points === 0) {
      setError('Số điểm phải là số nguyên khác 0 (âm để trừ, dương để cộng)');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateTrustScoreRule(editing.id, { label: form.label.trim(), points: form.points });
      } else {
        if (!CODE_PATTERN.test(form.code)) {
          setError('Mã lý do chỉ gồm chữ IN HOA, số và dấu gạch dưới (vd. TOP_CONTRIBUTOR)');
          setSaving(false);
          return;
        }
        await createTrustScoreRule({
          code: form.code,
          label: form.label.trim(),
          points: form.points,
        });
      }
      setModalOpen(false);
      setReloadTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được lý do');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(rule: TrustScoreRule) {
    setError(null);
    try {
      await updateTrustScoreRule(rule.id, { active: !rule.active });
      setReloadTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không đổi được trạng thái');
    }
  }

  async function handleDelete(rule: TrustScoreRule) {
    if (!window.confirm(`Xoá lý do "${rule.label}" (${rule.code})?`)) return;
    setError(null);
    try {
      await deleteTrustScoreRule(rule.id);
      setReloadTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không xoá được lý do');
    }
  }

  if (!userLoading && !isAdmin) {
    return (
      <CmsShell active="/cms/settings/trust-score">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-bold text-slate-800">Không đủ quyền truy cập</p>
          <p className="text-xs text-slate-500">
            Chỉ Admin hoặc Root Admin được quản lý lý do Trust Score.
          </p>
        </div>
      </CmsShell>
    );
  }

  return (
    <CmsShell active="/cms/settings/trust-score">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Lý Do Trust Score</h3>
            <p className="mt-1 text-xs text-slate-500">
              Các lý do cộng/trừ điểm uy tín. Lý do <strong>hệ thống</strong> được code tự kích hoạt
              (chỉ tắt, không xoá). Lý do <strong>tự tạo</strong> dùng khi Admin cộng/trừ điểm tay.
              Không có trần điểm.
            </p>
          </div>
          <Button variant="dark" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Thêm lý do
          </Button>
        </div>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        {rules === null ? (
          <p className="py-6 text-center text-xs text-slate-500">Đang tải...</p>
        ) : rules.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">Chưa có lý do nào.</p>
        ) : (
          <Table>
            <Thead>
              <Th>Mã</Th>
              <Th>Tên lý do</Th>
              <Th>Điểm</Th>
              <Th>Loại</Th>
              <Th>Trạng thái</Th>
              <Th className="text-right">Thao tác</Th>
            </Thead>
            <Tbody>
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <Td className="font-mono text-xs">{r.code}</Td>
                  <Td className="font-bold text-slate-800">{r.label}</Td>
                  <Td
                    className={`font-mono font-bold ${r.points < 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                  >
                    {r.points > 0 ? `+${r.points}` : r.points}
                  </Td>
                  <Td>
                    <Badge tone={r.isSystem ? 'info' : 'purple'}>
                      {r.isSystem ? 'Hệ thống' : 'Tự tạo'}
                    </Badge>
                  </Td>
                  <Td>
                    <button onClick={() => toggleActive(r)} className="hover:opacity-80">
                      <Badge tone={r.active ? 'positive' : 'neutral'}>
                        {r.active ? 'Đang áp dụng' : 'Đã tắt'}
                      </Badge>
                    </button>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Sửa
                      </Button>
                      {!r.isSystem && (
                        <Button variant="danger-ghost" size="sm" onClick={() => handleDelete(r)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          Xoá
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Sửa lý do ${editing.code}` : 'Thêm lý do Trust Score'}
      >
        <div className="space-y-3 text-xs">
          {!editing && (
            <Field label="Mã lý do (không đổi sau khi tạo)" hint="Chữ IN HOA, số, gạch dưới">
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="TOP_CONTRIBUTOR"
              />
            </Field>
          )}
          <Field label="Tên lý do (hiển thị cho Admin)">
            <Input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Đóng góp nổi bật tháng"
            />
          </Field>
          <Field label="Điểm (âm = trừ, dương = cộng)">
            <Input
              type="number"
              value={form.points}
              onChange={(e) => setForm((f) => ({ ...f, points: Number(e.target.value) }))}
            />
          </Field>
          <Button variant="dark" className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu lý do'}
          </Button>
        </div>
      </Modal>
    </CmsShell>
  );
}
