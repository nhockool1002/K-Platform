'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, CheckCircle2, Copy, PlusCircle, UploadCloud } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { KpiCard } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatKpoint } from '@/lib/format';
import { ApiError } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import { useWallet } from '@/lib/use-wallet';
import {
  VIETQR_BANKS,
  createWithdrawal,
  getSepayQr,
  getWallet,
  listTransactions,
  type SepayQrInfo,
  type WalletTransaction,
} from '@/lib/wallet-client';

// Khoảng poll trong lúc modal "Nạp KPoint" mở — phát hiện webhook SePay vừa
// cộng ví để tự chuyển sang màn "Thành công" thay vì đứng yên ở QR mãi.
const TOPUP_POLL_INTERVAL_MS = 3000;

// Các gói nạp KPoint dựng sẵn — bấm chọn thay vì phải tự gõ số tiền mỗi lần.
// 1 KPoint = 1 VNĐ nên giá trị cũng chính là số KPoint nhận được.
const PRESET_TOPUP_AMOUNTS = [
  10_000, 20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000,
] as const;
const MIN_TOPUP_AMOUNT = 10_000;

// VietQR hỗ trợ bake sẵn số tiền vào ảnh QR (?amount=) — dựng lại URL từ
// thông tin ngân hàng/nội dung đã có từ getSepayQr() thay vì gọi lại API mỗi
// lần đổi số tiền.
function buildTopupQrUrl(qr: SepayQrInfo, amount: number): string {
  const params = new URLSearchParams({
    amount: String(amount),
    addInfo: qr.content,
    accountName: qr.accountName,
  });
  return (
    `https://img.vietqr.io/image/${encodeURIComponent(qr.bankId)}-${encodeURIComponent(qr.accountNumber)}-compact2.png` +
    `?${params.toString()}`
  );
}

const TX_TYPE_LABEL: Record<WalletTransaction['type'], string> = {
  TOPUP_SEPAY: 'Nạp KPoint qua SePay (VietQR)',
  WITHDRAWAL_REQUEST: 'Yêu cầu rút tiền về ngân hàng',
  CAMPAIGN_RESERVE: 'Ký quỹ tạo Campaign',
  TASK_REWARD: 'Nhận thưởng hoàn thành review',
  ACCOUNT_ACTIVATION: 'Kích hoạt Tài khoản Dịch vụ',
  WITHDRAWAL_COMPLETED: 'Rút tiền đã được duyệt',
  WITHDRAWAL_REJECTED: 'Yêu cầu rút tiền bị từ chối',
};

const TX_TYPE_TONE: Record<WalletTransaction['type'], BadgeTone> = {
  TOPUP_SEPAY: 'positive',
  WITHDRAWAL_REQUEST: 'warning',
  CAMPAIGN_RESERVE: 'warning',
  TASK_REWARD: 'positive',
  ACCOUNT_ACTIVATION: 'info',
  WITHDRAWAL_COMPLETED: 'positive',
  WITHDRAWAL_REJECTED: 'critical',
};

export default function WalletPage() {
  const { user } = useCurrentUser();
  const { wallet, loading: walletLoading, refresh: refreshWallet } = useWallet();

  const [topupOpen, setTopupOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [gateway, setGateway] = useState<'SEPAY' | 'BMC'>('SEPAY');

  const [qr, setQr] = useState<SepayQrInfo | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [topupBaseline, setTopupBaseline] = useState<string | null>(null);
  const [topupSuccessAmount, setTopupSuccessAmount] = useState<number | null>(null);
  const [topupAmount, setTopupAmount] = useState<number | null>(null);
  const [customAmountInput, setCustomAmountInput] = useState('');
  const [customAmountError, setCustomAmountError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<WalletTransaction[] | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const [withdrawForm, setWithdrawForm] = useState({
    amountKpoint: '',
    bankId: VIETQR_BANKS[0] as string,
    bankAccountNumber: '',
    bankAccountName: '',
  });
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

  useEffect(() => {
    listTransactions(user?.activeMode)
      .then(setTransactions)
      .catch((err) => {
        setTxError(err instanceof ApiError ? err.message : 'Không tải được lịch sử giao dịch');
        setTransactions([]);
      });
  }, [user?.activeMode]);

  function openTopup() {
    setTopupOpen(true);
    setTopupSuccessAmount(null);
    setTopupAmount(null);
    setCustomAmountInput('');
    setCustomAmountError(null);
    // Lấy baseline số dư MỚI mỗi lần mở modal (không dùng `wallet` từ
    // useWallet() vì có thể đã cũ) — poll bên dưới so sánh với mốc này để
    // biết lúc nào webhook SePay vừa cộng tiền.
    getWallet()
      .then((w) => setTopupBaseline(w.balanceKpoint))
      .catch(() => setTopupBaseline(null));
    if (!qr) {
      getSepayQr()
        .then(setQr)
        .catch((err) => {
          setQrError(err instanceof ApiError ? err.message : 'Không tạo được mã QR nạp tiền');
        });
    }
  }

  function closeTopup() {
    setTopupOpen(false);
    setTopupSuccessAmount(null);
    setTopupBaseline(null);
    setTopupAmount(null);
    setCustomAmountInput('');
    setCustomAmountError(null);
  }

  function confirmCustomAmount() {
    const amount = Number(customAmountInput);
    if (!Number.isInteger(amount) || amount < MIN_TOPUP_AMOUNT) {
      setCustomAmountError(`Số tiền thấp nhất là ${formatKpoint(MIN_TOPUP_AMOUNT)}`);
      return;
    }
    setCustomAmountError(null);
    setTopupAmount(amount);
  }

  // Poll trong lúc modal mở ở tab SePay, chưa phát hiện thành công — dừng
  // ngay khi đóng modal hoặc đã thấy số dư tăng.
  useEffect(() => {
    if (
      !topupOpen ||
      gateway !== 'SEPAY' ||
      topupSuccessAmount !== null ||
      topupBaseline === null
    ) {
      return;
    }
    const timer = setInterval(() => {
      getWallet()
        .then((w) => {
          const delta = Number(w.balanceKpoint) - Number(topupBaseline);
          if (delta > 0) {
            setTopupSuccessAmount(delta);
            refreshWallet();
            listTransactions(user?.activeMode)
              .then(setTransactions)
              .catch(() => {});
          }
        })
        .catch(() => {
          // Bỏ qua lỗi 1 tick — thử lại ở lần poll sau, không chặn UI.
        });
    }, TOPUP_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [topupOpen, gateway, topupSuccessAmount, topupBaseline, user?.activeMode, refreshWallet]);

  function copyContent() {
    if (!qr) return;
    navigator.clipboard
      .writeText(qr.content)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        // Một số trình duyệt/context chặn Clipboard API (thiếu permission,
        // không phải HTTPS...) — bỏ qua, người dùng vẫn đọc/chép tay được nội
        // dung hiển thị ngay trên nút.
      });
  }

  async function handleWithdrawSubmit() {
    setWithdrawError(null);
    const amount = Number(withdrawForm.amountKpoint);
    if (!Number.isInteger(amount) || amount <= 0) {
      setWithdrawError('Số KPoint rút không hợp lệ');
      return;
    }
    if (!withdrawForm.bankAccountNumber || !withdrawForm.bankAccountName) {
      setWithdrawError('Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng');
      return;
    }

    setWithdrawSubmitting(true);
    try {
      await createWithdrawal({
        amountKpoint: amount,
        bankId: withdrawForm.bankId,
        bankAccountNumber: withdrawForm.bankAccountNumber,
        bankAccountName: withdrawForm.bankAccountName,
      });
      setWithdrawOpen(false);
      setWithdrawForm({
        amountKpoint: '',
        bankId: VIETQR_BANKS[0] as string,
        bankAccountNumber: '',
        bankAccountName: '',
      });
      refreshWallet();
      listTransactions(user?.activeMode)
        .then(setTransactions)
        .catch(() => {});
    } catch (err) {
      setWithdrawError(err instanceof ApiError ? err.message : 'Không gửi được lệnh rút tiền');
    } finally {
      setWithdrawSubmitting(false);
    }
  }

  return (
    <AppShell active="/wallet">
      <div className="space-y-6">
        <PageHeader
          title="Quản Lý Ví KPoint & Giao Dịch"
          description="Quy chuẩn tài chính: 1 KPoint = 1 VNĐ. Tích hợp cổng VietQR SePay và Buy Me a Coffee quốc tế."
          actions={
            <>
              <Button variant="gold" onClick={openTopup}>
                <PlusCircle className="h-4 w-4" />
                Nạp KPoint
              </Button>
              <Button variant="dark" onClick={() => setWithdrawOpen(true)}>
                <ArrowUpRight className="h-4 w-4" />
                Rút Về Ngân Hàng
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label="Số Dư Ví Khả Dụng"
            value={walletLoading || !wallet ? '···' : formatKpoint(Number(wallet.availableKpoint))}
            valueClassName="text-brand-blue text-3xl"
            hint="Khả dụng cho mọi thanh toán / rút tiền"
          />
          <KpiCard
            label="Ký Quỹ Đang Khóa (Reserved)"
            value={walletLoading || !wallet ? '···' : formatKpoint(Number(wallet.reservedKpoint))}
            valueClassName="text-amber-600 text-3xl"
            hint="Campaign đang chạy + lệnh rút chờ duyệt"
          />
          <KpiCard
            label="Tổng Số Dư (Balance)"
            value={walletLoading || !wallet ? '···' : formatKpoint(Number(wallet.balanceKpoint))}
            valueClassName="text-slate-800 text-3xl"
            hint="Khả dụng + đang khoá"
          />
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase">
              Lịch Sử Biến Động Số Dư (Ledger)
            </h3>
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-xs text-emerald-600">
              ACID Transaction Log
            </span>
          </div>

          {txError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {txError}
            </p>
          )}

          {transactions === null ? (
            <p className="py-6 text-center text-xs text-slate-500">Đang tải...</p>
          ) : transactions.length === 0 ? (
            <EmptyState
              title="Chưa có giao dịch nào"
              body="Nạp KPoint qua SePay hoặc tạo Campaign để bắt đầu có lịch sử biến động."
            />
          ) : (
            <Table>
              <Thead>
                <Th>Mã giao dịch</Th>
                <Th>Thời gian</Th>
                <Th>Loại biến động</Th>
                <Th>Số dư</Th>
                <Th>Ký quỹ</Th>
                <Th>Ghi chú</Th>
              </Thead>
              <Tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="font-mono hover:bg-slate-50">
                    <Td className="font-bold text-brand-blue">
                      #{(tx.txnId ?? tx.id).slice(0, 8)}
                    </Td>
                    <Td className="text-slate-500">
                      {new Date(tx.createdAt).toLocaleString('vi-VN')}
                    </Td>
                    <Td className="font-sans font-semibold text-slate-800">
                      <Badge tone={TX_TYPE_TONE[tx.type]}>{TX_TYPE_LABEL[tx.type]}</Badge>
                    </Td>
                    <Td
                      className={
                        tx.balanceDeltaKpoint === '0'
                          ? 'text-slate-300'
                          : Number(tx.balanceDeltaKpoint) >= 0
                            ? 'font-bold text-emerald-600'
                            : 'font-bold text-rose-600'
                      }
                    >
                      {tx.balanceDeltaKpoint === '0'
                        ? '—'
                        : `${Number(tx.balanceDeltaKpoint) >= 0 ? '+' : ''}${formatKpoint(Number(tx.balanceDeltaKpoint))}`}
                    </Td>
                    <Td
                      className={
                        tx.reservedDeltaKpoint === '0'
                          ? 'text-slate-300'
                          : 'font-bold text-amber-600'
                      }
                    >
                      {tx.reservedDeltaKpoint === '0'
                        ? '—'
                        : `${Number(tx.reservedDeltaKpoint) >= 0 ? '+' : ''}${formatKpoint(Number(tx.reservedDeltaKpoint))}`}
                    </Td>
                    <Td
                      className="max-w-[220px] truncate font-sans text-slate-500"
                      title={tx.note ?? ''}
                    >
                      {tx.note ?? '—'}
                    </Td>
                  </tr>
                ))}
              </Tbody>
            </Table>
          )}
        </div>
      </div>

      <Modal open={topupOpen} onClose={closeTopup} title="Nạp KPoint Vào Ví">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">1 KPoint = 1 VNĐ</p>
          <div className="flex border-b border-slate-200 text-xs font-bold">
            <button
              onClick={() => setGateway('SEPAY')}
              className={`flex-1 border-b-2 py-2.5 text-center ${gateway === 'SEPAY' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-500'}`}
            >
              VietQR (SePay 24/7)
            </button>
            <button
              onClick={() => setGateway('BMC')}
              className={`flex-1 border-b-2 py-2.5 text-center ${gateway === 'BMC' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-slate-500'}`}
            >
              Buy Me a Coffee (USD)
            </button>
          </div>

          {gateway === 'SEPAY' ? (
            topupSuccessAmount !== null ? (
              <div className="space-y-3 py-6 text-center">
                <span className="success-check-wrap mx-auto">
                  <CheckCircle2 className="success-check-icon h-12 w-12 text-emerald-500" />
                </span>
                <p className="text-base font-extrabold text-emerald-600">Nạp KPoint thành công!</p>
                <p className="text-sm text-slate-600">
                  +{formatKpoint(topupSuccessAmount)} đã được cộng vào ví.
                </p>
                <Button variant="gold" onClick={closeTopup}>
                  Đóng
                </Button>
              </div>
            ) : qrError ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {qrError}
              </p>
            ) : !qr ? (
              <p className="py-6 text-center text-xs text-slate-500">Đang tạo mã QR...</p>
            ) : topupAmount === null ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-700">Chọn số tiền muốn nạp:</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PRESET_TOPUP_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTopupAmount(amount)}
                      className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 transition hover:border-brand-blue hover:bg-blue-50 hover:text-brand-blue"
                    >
                      {formatKpoint(amount)}
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <p className="mb-1.5 text-xs font-bold text-slate-700">
                    Hoặc tự nhập số tiền (tối thiểu {formatKpoint(MIN_TOPUP_AMOUNT)}):
                  </p>
                  {customAmountError && (
                    <p className="mb-1.5 text-[11px] text-rose-600">{customAmountError}</p>
                  )}
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={MIN_TOPUP_AMOUNT}
                      step={1000}
                      value={customAmountInput}
                      onChange={(e) => {
                        setCustomAmountInput(e.target.value);
                        setCustomAmountError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmCustomAmount();
                      }}
                      placeholder="VD: 150000"
                      className="flex-1"
                    />
                    <Button variant="blue" onClick={confirmCustomAmount}>
                      Tạo QR
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <div className="inline-block rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- ảnh QR động từ img.vietqr.io, không qua Next/Image optimize */}
                  <img
                    src={buildTopupQrUrl(qr, topupAmount)}
                    alt="Mã QR VietQR nạp KPoint"
                    className="h-48 w-48"
                  />
                </div>
                <p className="text-sm font-extrabold text-brand-blue">
                  {formatKpoint(topupAmount)}
                </p>
                <div className="text-xs">
                  <span className="block text-slate-500">
                    Chuyển khoản tới {qr.accountName} — {qr.bankId} — {qr.accountNumber}
                  </span>
                  <span className="mt-1 block text-slate-500">Cú pháp chuyển khoản bắt buộc:</span>
                  <button
                    onClick={copyContent}
                    className="mt-1 inline-flex items-center gap-1.5 rounded border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-sm font-bold text-brand-blue hover:bg-blue-100"
                  >
                    {qr.content}
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <p className="mt-2 text-[11px] text-slate-400">
                    KPoint được cộng tự động trong vài giây sau khi chuyển khoản thành công.
                  </p>
                  <button
                    onClick={() => setTopupAmount(null)}
                    className="mt-2 block w-full text-center text-[11px] font-bold text-slate-400 hover:text-brand-blue"
                  >
                    Đổi số tiền khác
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 leading-tight text-amber-900">
                Thanh toán qua Buy Me a Coffee (USD) → Nhập Transaction ID và ảnh biên lai để Admin
                CMS duyệt thủ công.
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Mã Giao Dịch BMC ID *</label>
                <Input placeholder="#BMC-99120-TX" disabled />
              </div>
              <Button variant="gold" className="w-full" disabled title="Sắp ra mắt — Phase 6">
                <UploadCloud className="h-4 w-4" />
                Gửi Biên Lai Duyệt Nạp (Sắp ra mắt)
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title="Rút KPoint Về Ngân Hàng"
      >
        <div className="space-y-3 text-xs">
          <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 leading-tight text-blue-900">
            Lệnh rút sẽ khoá ngay số KPoint yêu cầu khỏi số dư khả dụng, trạng thái{' '}
            <strong>Chờ duyệt (PENDING)</strong>. Admin xử lý chuyển khoản thủ công.
          </p>

          {withdrawError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
              {withdrawError}
            </p>
          )}

          <Field label="Số KPoint muốn rút (tối thiểu 50.000)">
            <Input
              type="number"
              min={50_000}
              step={1000}
              value={withdrawForm.amountKpoint}
              onChange={(e) => setWithdrawForm((f) => ({ ...f, amountKpoint: e.target.value }))}
              placeholder="100000"
            />
          </Field>
          <Field label="Ngân hàng">
            <Select
              value={withdrawForm.bankId}
              onChange={(e) => setWithdrawForm((f) => ({ ...f, bankId: e.target.value }))}
            >
              {VIETQR_BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Số tài khoản">
            <Input
              value={withdrawForm.bankAccountNumber}
              onChange={(e) =>
                setWithdrawForm((f) => ({ ...f, bankAccountNumber: e.target.value }))
              }
              placeholder="0123456789"
            />
          </Field>
          <Field label="Tên chủ tài khoản">
            <Input
              value={withdrawForm.bankAccountName}
              onChange={(e) => setWithdrawForm((f) => ({ ...f, bankAccountName: e.target.value }))}
              placeholder="NGUYEN VAN A"
            />
          </Field>

          <Button
            variant="dark"
            className="w-full"
            onClick={handleWithdrawSubmit}
            disabled={withdrawSubmitting}
          >
            <ArrowUpRight className="h-4 w-4" />
            {withdrawSubmitting ? 'Đang gửi...' : 'Gửi Lệnh Rút Tiền'}
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
