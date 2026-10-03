'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatKpoint } from '@/lib/format';
import { activateAccount } from '@/lib/account-client';
import { ApiError } from '@/lib/auth-client';

// Dùng chung ở Dashboard Tài khoản Dịch vụ (nút "Kích hoạt ngay" — issue #53)
// và ở AppShell (switcher chuyển sang chế độ Dịch Vụ khi chưa kích hoạt —
// issue #54). Luôn yêu cầu xác nhận trước khi trừ phí, không kích hoạt ngầm.
export function ActivationConfirmModal({
  open,
  feeKpoint,
  onClose,
  onActivated,
}: {
  open: boolean;
  feeKpoint: string | number;
  onClose: () => void;
  onActivated: () => void;
}) {
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setActivating(true);
    setError(null);
    try {
      await activateAccount();
      onActivated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể kích hoạt Tài khoản Dịch vụ');
    } finally {
      setActivating(false);
    }
  }

  function handleClose() {
    if (activating) return;
    setError(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      eyebrow="Tài khoản Dịch vụ"
      title="Xác nhận kích hoạt"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={activating}>
            Hủy
          </Button>
          <Button variant="gold" size="sm" onClick={handleConfirm} disabled={activating}>
            {activating ? 'Đang kích hoạt...' : 'Xác nhận & Kích hoạt'}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs">
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-slate-700">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-gold" />
          <p>
            Kích hoạt Tài khoản Dịch vụ để mở chức năng tạo Campaign. Phí kích hoạt{' '}
            <strong>1 lần duy nhất</strong>:{' '}
            <strong className="text-brand-gold">{formatKpoint(Number(feeKpoint))}</strong>, trừ trực
            tiếp từ Số Dư Ví Khả Dụng.
          </p>
        </div>
        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
