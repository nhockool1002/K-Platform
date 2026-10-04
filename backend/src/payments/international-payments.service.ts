import { AuditService } from '../audit/audit.service.js';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AuditActionType,
  AuditLevel,
  BmcTopupStatus,
  WalletTxSide,
  WalletTxType,
} from '../prisma/client.js';
import { ExchangeRateConfigService } from '../settings/exchange-rate-config.service.js';
import { BMC_RECEIPTS_DIR } from '../submissions/upload-paths.js';
import { generateTopupCode, isUniqueConstraintError } from './payments.service.js';
import { InternationalPackagesService } from './international-packages.service.js';
import type { DecideBmcTopupDto } from './dto/decide-bmc-topup.dto.js';

const BMC_REFERENCE_PREFIX = 'KPL-';
const PENDING = BmcTopupStatus.PENDING_MANUAL_VERIFICATION;

export type TopupSource = 'SEPAY' | 'BMC';

export interface AdminTopupRow {
  id: string;
  source: TopupSource;
  user: { id: string; email: string };
  reference: string;
  amountUsd: string | null;
  usdToVnd: string | null;
  kpointAmount: string;
  status: BmcTopupStatus | 'CREDITED';
  packageName: string | null;
  rejectReason: string | null;
  hasReceipt: boolean;
  verifiedBy: { id: string; email: string } | null;
  verifiedAt: string | null;
  createdAt: string;
  reviewDeadline: string | null;
  isOverdue: boolean;
}

function toPublicTopup(t: {
  id: string;
  txnId: string;
  packageName: string;
  amountUsd: { toString(): string };
  exchangeRateUsdToVnd: { toString(): string };
  kpointAmount: bigint;
  status: BmcTopupStatus;
  receiptUrl: string | null;
  rejectReason: string | null;
  createdAt: Date;
  bmcUrl: string;
}) {
  return {
    id: t.id,
    reference: t.txnId,
    packageName: t.packageName,
    amountUsd: t.amountUsd.toString(),
    usdToVnd: t.exchangeRateUsdToVnd.toString(),
    kpointAmount: t.kpointAmount.toString(),
    status: t.status,
    hasReceipt: Boolean(t.receiptUrl),
    rejectReason: t.rejectReason,
    bmcUrl: t.bmcUrl,
    createdAt: t.createdAt.toISOString(),
  };
}

@Injectable()
export class InternationalPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly rates: ExchangeRateConfigService,
    private readonly packages: InternationalPackagesService,
  ) {}

  async listPackagesForUser() {
    const [packages, rate] = await Promise.all([
      this.packages.listActive(),
      this.rates.getCurrentRate(),
    ]);
    return {
      usdToVnd: rate.usdToVnd,
      packages: packages.map((p) => ({
        id: p.id,
        name: p.name,
        amountUsd: p.amountUsd.toString(),
        estimatedKpoint: Math.round(Number(p.amountUsd) * rate.usdToVnd).toString(),
        bmcUrl: p.bmcUrl,
      })),
    };
  }

  // Bước 1: tạo mã KPL- và chốt tỷ giá tại thời điểm user bắt đầu nạp
  // (B-02 — tỷ giá tính theo thời điểm nạp, không đổi về sau).
  async initiate(userId: string, packageId: string) {
    const pkg = await this.prisma.internationalPackage.findUnique({ where: { id: packageId } });
    if (!pkg || !pkg.active) {
      throw new BadRequestException('Gói nạp không tồn tại hoặc đã ngừng bán');
    }
    const rate = await this.rates.getCurrentRate();
    const kpointAmount = BigInt(Math.round(Number(pkg.amountUsd) * rate.usdToVnd));

    for (let attempt = 0; attempt < 5; attempt++) {
      const reference = `${BMC_REFERENCE_PREFIX}${generateTopupCode()}`;
      try {
        const topup = await this.prisma.bmcTopup.create({
          data: {
            userId,
            packageId: pkg.id,
            packageName: pkg.name,
            bmcUrl: pkg.bmcUrl,
            amountUsd: pkg.amountUsd,
            exchangeRateUsdToVnd: rate.usdToVnd,
            kpointAmount,
            txnId: reference,
            status: BmcTopupStatus.AWAITING_PAYMENT,
          },
        });
        return toPublicTopup(topup);
      } catch (err) {
        if (!isUniqueConstraintError(err)) throw err;
      }
    }
    throw new Error('Không thể sinh mã KPL- duy nhất sau nhiều lần thử');
  }

  // Bước 2: user upload biên lai sau khi đã chuyển khoản trên BMC.
  async attachReceipt(userId: string, topupId: string, filename: string) {
    const topup = await this.prisma.bmcTopup.findUnique({ where: { id: topupId } });
    if (!topup || topup.userId !== userId) {
      throw new NotFoundException('Không tìm thấy giao dịch nạp của bạn');
    }
    if (topup.status !== BmcTopupStatus.AWAITING_PAYMENT) {
      throw new BadRequestException('Giao dịch này không còn ở trạng thái chờ biên lai');
    }
    const updated = await this.prisma.bmcTopup.update({
      where: { id: topupId },
      data: { receiptUrl: filename, status: PENDING },
    });
    return toPublicTopup(updated);
  }

  async listMine(userId: string) {
    const rows = await this.prisma.bmcTopup.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map(toPublicTopup);
  }

  // Đối soát tổng hợp (CMS): nạp SePay (tự động, luôn CREDITED) + nạp BMC
  // (chờ duyệt thủ công). Gộp 2 nguồn, sắp xếp mới nhất trước.
  async listForReconciliation(source?: TopupSource, status?: BmcTopupStatus) {
    const reviewDays = await this.rates.getReviewDays();
    const reviewMs = reviewDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const includeBmc = !source || source === 'BMC';
    const includeSepay = (!source || source === 'SEPAY') && !status;

    const bmcRows: AdminTopupRow[] = includeBmc
      ? (
          await this.prisma.bmcTopup.findMany({
            where: status ? { status } : undefined,
            include: {
              user: { select: { id: true, email: true } },
              verifiedBy: { select: { id: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
          })
        ).map((t) => {
          const deadline = new Date(t.createdAt.getTime() + reviewMs);
          const awaiting = t.status === PENDING;
          return {
            id: t.id,
            source: 'BMC' as const,
            user: t.user,
            reference: t.txnId,
            amountUsd: t.amountUsd.toString(),
            usdToVnd: t.exchangeRateUsdToVnd.toString(),
            kpointAmount: t.kpointAmount.toString(),
            status: t.status,
            packageName: t.packageName,
            rejectReason: t.rejectReason,
            hasReceipt: Boolean(t.receiptUrl),
            verifiedBy: t.verifiedBy,
            verifiedAt: t.verifiedAt?.toISOString() ?? null,
            createdAt: t.createdAt.toISOString(),
            reviewDeadline: awaiting ? deadline.toISOString() : null,
            isOverdue: awaiting && deadline.getTime() < now,
          };
        })
      : [];

    const sepayRows: AdminTopupRow[] = includeSepay
      ? (
          await this.prisma.walletTransaction.findMany({
            where: { type: WalletTxType.TOPUP_SEPAY },
            include: { user: { select: { id: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            take: 200,
          })
        ).map((t) => ({
          id: t.id,
          source: 'SEPAY' as const,
          user: t.user,
          reference: t.txnId ?? '—',
          amountUsd: null,
          usdToVnd: null,
          kpointAmount: t.balanceDeltaKpoint.toString(),
          status: 'CREDITED' as const,
          packageName: null,
          rejectReason: null,
          hasReceipt: false,
          verifiedBy: null,
          verifiedAt: null,
          createdAt: t.createdAt.toISOString(),
          reviewDeadline: null,
          isOverdue: false,
        }))
      : [];

    return [...bmcRows, ...sepayRows]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 200);
  }

  // Duyệt/Từ chối (Admin). Approve: khoá row giao dịch + row ví, cộng KPoint
  // theo tỷ giá đã snapshot lúc user nạp, ghi ledger + audit log trong cùng
  // transaction — một trong các bước lỗi thì không bước nào được ghi.
  async decide(adminId: string, topupId: string, dto: DecideBmcTopupDto) {
    if (dto.decision === 'REJECT' && !dto.reason?.trim()) {
      throw new BadRequestException('Vui lòng nhập lý do từ chối');
    }

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        {
          id: string;
          user_id: string;
          status: BmcTopupStatus;
          kpoint_amount: bigint;
          txn_id: string;
        }[]
      >`SELECT id, user_id, status, kpoint_amount, txn_id FROM bmc_topups WHERE id = ${topupId} FOR UPDATE`;
      const topup = rows[0];
      if (!topup) throw new NotFoundException('Không tìm thấy giao dịch nạp');
      if (topup.status !== PENDING) {
        throw new BadRequestException('Giao dịch này đã được xử lý trước đó');
      }

      const now = new Date();
      if (dto.decision === 'APPROVE') {
        await tx.$queryRaw`SELECT id FROM wallets WHERE user_id = ${topup.user_id} FOR UPDATE`;
        await tx.wallet.update({
          where: { userId: topup.user_id },
          data: { balanceKpoint: { increment: topup.kpoint_amount } },
        });
        await tx.walletTransaction.create({
          data: {
            userId: topup.user_id,
            type: WalletTxType.TOPUP_BMC,
            side: WalletTxSide.SHARED,
            balanceDeltaKpoint: topup.kpoint_amount,
            note: `Nạp quốc tế BMC ${topup.txn_id}`,
          },
        });
      }

      const updated = await tx.bmcTopup.update({
        where: { id: topupId },
        data: {
          status: dto.decision === 'APPROVE' ? BmcTopupStatus.APPROVED : BmcTopupStatus.REJECTED,
          rejectReason: dto.decision === 'REJECT' ? dto.reason!.trim() : null,
          verifiedById: adminId,
          verifiedAt: now,
        },
      });

      await await this.audit.write(
        {
          actorId: adminId,
          targetResource: `bmc_topup:${topupId}`,
          actionType: AuditActionType.MANUAL_TOPUP,
          level: dto.decision === 'APPROVE' ? AuditLevel.CRITICAL : AuditLevel.INFO,
          payloadBefore: { status: PENDING },
          payloadAfter: {
            status: updated.status,
            reference: topup.txn_id,
            kpointAmount: topup.kpoint_amount.toString(),
            rejectReason: updated.rejectReason,
          },
        },
        tx,
      );

      return toPublicTopup(updated);
    });
  }

  async getReceiptPath(topupId: string): Promise<string> {
    const topup = await this.prisma.bmcTopup.findUnique({ where: { id: topupId } });
    if (!topup?.receiptUrl) throw new NotFoundException('Giao dịch này chưa có biên lai');
    const path = join(BMC_RECEIPTS_DIR, topup.receiptUrl);
    if (!existsSync(path)) throw new NotFoundException('Không tìm thấy file biên lai trên máy chủ');
    return path;
  }
}

export function newReceiptFilename(originalName: string): string {
  const unique = randomBytes(8).toString('hex');
  const ext = originalName.match(/\.[a-zA-Z0-9]{1,5}$/)?.[0]?.toLowerCase() ?? '';
  return `${Date.now()}-${unique}${ext}`;
}
