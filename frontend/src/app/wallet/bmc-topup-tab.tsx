'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, UploadCloud } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/auth-client';
import { formatKpoint } from '@/lib/format';
import {
  getBmcPackages,
  initiateBmcTopup,
  listMyBmcTopups,
  uploadBmcReceipt,
  type BmcPackage,
  type BmcTopup,
  type BmcTopupStatus,
} from '@/lib/bmc-client';

const STATUS_TONE: Record<BmcTopupStatus, BadgeTone> = {
  AWAITING_PAYMENT: 'gold',
  PENDING_MANUAL_VERIFICATION: 'warning',
  APPROVED: 'positive',
  REJECTED: 'critical',
};

const STATUS_LABEL: Record<BmcTopupStatus, string> = {
  AWAITING_PAYMENT: 'Awaiting receipt · Chờ biên lai',
  PENDING_MANUAL_VERIFICATION: 'Verifying · Đang đối soát',
  APPROVED: 'Approved · Đã duyệt',
  REJECTED: 'Rejected · Từ chối',
};

const ACCEPTED_RECEIPT = 'image/png,image/jpeg,image/webp,application/pdf';

export function BmcTopupTab() {
  const [packages, setPackages] = useState<BmcPackage[] | null>(null);
  const [usdToVnd, setUsdToVnd] = useState<number | null>(null);
  const [history, setHistory] = useState<BmcTopup[]>([]);
  const [current, setCurrent] = useState<BmcTopup | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function refresh() {
    const [pkgs, mine] = await Promise.all([getBmcPackages(), listMyBmcTopups()]);
    setPackages(pkgs.packages);
    setUsdToVnd(pkgs.usdToVnd);
    setHistory(mine);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([getBmcPackages(), listMyBmcTopups()])
      .then(([pkgs, mine]) => {
        if (cancelled) return;
        setPackages(pkgs.packages);
        setUsdToVnd(pkgs.usdToVnd);
        setHistory(mine);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : 'Could not load packages · Không tải được gói nạp',
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function start(pkg: BmcPackage) {
    setBusy(true);
    setError(null);
    setSubmitted(false);
    try {
      const topup = await initiateBmcTopup(pkg.id);
      setCurrent(topup);
      setReceiptFile(null);
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not start payment · Không tạo được lệnh nạp',
      );
    } finally {
      setBusy(false);
    }
  }

  function resume(topup: BmcTopup) {
    setCurrent(topup);
    setReceiptFile(null);
    setSubmitted(false);
    setError(null);
  }

  async function copyReference() {
    if (!current) return;
    await navigator.clipboard.writeText(current.reference).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function submitReceipt() {
    if (!current || !receiptFile) return;
    setBusy(true);
    setError(null);
    try {
      await uploadBmcReceipt(current.id, receiptFile);
      setSubmitted(true);
      setCurrent(null);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed · Tải biên lai thất bại');
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-3 py-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <p className="text-base font-extrabold text-slate-800">
          Receipt received · Đã nhận biên lai
        </p>
        <p className="text-xs text-slate-600">
          Our team will verify your payment on Buy Me a Coffee and credit KPoint to your wallet.
          <br />
          <span className="text-[11px] text-slate-500">
            Đội ngũ sẽ đối soát trên Buy Me a Coffee rồi cộng KPoint vào ví của bạn.
          </span>
        </p>
        <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
          Close · Đóng
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      <div>
        <h4 className="text-sm font-extrabold text-slate-900">International Payment</h4>
        <p className="text-[11px] text-slate-500">Thanh toán quốc tế (USD)</p>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
          {error}
        </p>
      )}

      {current ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 leading-snug text-amber-900">
            <p className="font-bold">Step 2 · Pay on Buy Me a Coffee</p>
            <p className="mt-1">
              Paste the code below into the <strong>message</strong> field when you pay. Then upload
              your receipt.
            </p>
            <p className="mt-1 text-[11px] text-amber-800">
              Bước 2 · Dán mã dưới đây vào ô <strong>lời nhắn</strong> khi thanh toán, sau đó tải
              biên lai.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Your reference code · Mã đối soát
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="font-mono text-base font-extrabold text-slate-900">
                {current.reference}
              </span>
              <Button variant="outline" size="sm" onClick={copyReference}>
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copied · Đã chép' : 'Copy · Chép'}
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-slate-600">
              {current.packageName} · ${current.amountUsd} ≈{' '}
              {formatKpoint(Number(current.kpointAmount))} (rate{' '}
              {Number(current.usdToVnd).toLocaleString('vi-VN')} VNĐ/USD)
            </p>
          </div>

          <a
            href={current.bmcUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-gold px-4 py-2.5 font-bold text-slate-950 shadow-sm hover:bg-brand-gold-hover"
          >
            <ExternalLink className="h-4 w-4" />
            Open Buy Me a Coffee · Mở trang thanh toán
          </a>

          <div>
            <label className="mb-1 block font-bold text-slate-700">
              Payment receipt · Biên lai (PNG/JPG/WEBP/PDF, ≤ 5MB)
            </label>
            <input
              type="file"
              accept={ACCEPTED_RECEIPT}
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:font-bold file:text-slate-700"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="gold"
              className="flex-1"
              disabled={!receiptFile || busy}
              onClick={submitReceipt}
            >
              <UploadCloud className="h-4 w-4" />
              {busy ? 'Submitting… · Đang gửi' : 'Submit receipt · Gửi biên lai'}
            </Button>
            <Button variant="ghost" onClick={() => setCurrent(null)}>
              Back · Quay lại
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="font-bold text-slate-700">
            Step 1 · Choose a package · Bước 1 · Chọn gói nạp
          </p>
          {packages === null ? (
            <p className="py-4 text-center text-slate-500">Loading… · Đang tải</p>
          ) : packages.length === 0 ? (
            <p className="py-4 text-center text-slate-500">
              No packages available · Chưa có gói nạp
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  disabled={busy}
                  onClick={() => start(pkg)}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-gold hover:shadow-sm disabled:opacity-50"
                >
                  <p className="text-lg font-extrabold text-slate-900">${pkg.amountUsd}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{pkg.name}</p>
                  <p className="mt-2 font-mono text-[11px] font-bold text-emerald-600">
                    ≈ {formatKpoint(Number(pkg.estimatedKpoint))}
                  </p>
                </button>
              ))}
            </div>
          )}
          {usdToVnd !== null && (
            <p className="text-[11px] text-slate-500">
              Rate locked when you start · Tỷ giá chốt khi bắt đầu nạp:{' '}
              {usdToVnd.toLocaleString('vi-VN')} VNĐ/USD
            </p>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <p className="mb-2 font-bold text-slate-700">
            Your international top-ups · Lịch sử nạp quốc tế
          </p>
          <ul className="space-y-1.5">
            {history.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-bold text-slate-800">{t.reference}</p>
                  <p className="truncate text-[10px] text-slate-500">
                    ${t.amountUsd} · {formatKpoint(Number(t.kpointAmount))}
                  </p>
                  {t.rejectReason && (
                    <p className="text-[10px] text-rose-600">Reason · Lý do: {t.rejectReason}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                  {t.status === 'AWAITING_PAYMENT' && (
                    <Button variant="outline" size="sm" onClick={() => resume(t)}>
                      Continue · Tiếp tục
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
