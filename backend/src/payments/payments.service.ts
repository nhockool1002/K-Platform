import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { WalletTxSide, WalletTxType, WithdrawalStatus } from '../prisma/client.js';
import { SepayConfigService } from '../settings/sepay-config.service.js';
import type { CreateWithdrawalDto } from './dto/create-withdrawal.dto.js';
import type { DecideWithdrawalDto } from './dto/decide-withdrawal.dto.js';

const MIN_WITHDRAWAL_KPOINT = 50_000n;

// Tiền tố nội dung chuyển khoản SePay — theo quy ước dự án (khác hậu tố
// "KPOINT <UserID>" ban đầu trong SRS, đổi theo yêu cầu thực tế).
const SEPAY_CONTENT_PREFIX = 'KLP';

// Bỏ 0/O và 1/I để tránh nhầm lẫn khi người dùng gõ tay lại nội dung chuyển
// khoản từ app ngân hàng (không phải lúc nào cũng quét QR được).
const TOPUP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TOPUP_CODE_LENGTH = 8;

export function generateTopupCode(): string {
  const bytes = randomBytes(TOPUP_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < TOPUP_CODE_LENGTH; i++) {
    code += TOPUP_CODE_ALPHABET[bytes[i]! % TOPUP_CODE_ALPHABET.length];
  }
  return code;
}

export function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sepayConfig: SepayConfigService,
  ) {}

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Không tìm thấy ví KPoint của bạn');
    return this.toPublicWallet(wallet);
  }

  // P2-04 (FN-PAY-01) — QR tĩnh theo user: nội dung `KLP_<topupCode>`, sinh
  // lười (lazy) lần đầu user vào ví thay vì lúc đăng ký.
  async getTopupQr(userId: string) {
    const config = await this.sepayConfig.getConfig();
    if (!config) {
      throw new BadRequestException(
        'Cổng SePay chưa được cấu hình — vào CMS "Cài Đặt > Cài đặt SePay" để thiết lập',
      );
    }
    const { bankId, bankAccountNumber: accountNumber, bankAccountName: accountName } = config;

    const topupCode = await this.ensureTopupCode(userId);
    const content = `${SEPAY_CONTENT_PREFIX}_${topupCode}`;
    const qrImageUrl =
      `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(accountNumber)}-compact2.png` +
      `?addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(accountName)}`;

    return { bankId, accountNumber, accountName, content, qrImageUrl };
  }

  private async ensureTopupCode(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { topupCode: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản của bạn');
    if (user.topupCode) return user.topupCode;

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateTopupCode();
      try {
        await this.prisma.user.update({ where: { id: userId }, data: { topupCode: code } });
        return code;
      } catch (err) {
        if (!isUniqueConstraintError(err)) throw err;
      }
    }
    throw new Error('Không thể sinh mã nạp tiền duy nhất sau nhiều lần thử');
  }

  // P2-05/P2-06/P2-07 (FN-PAY-01) — webhook SePay: parse nội dung CK để tìm
  // topupCode, cộng KPoint = transferAmount (1 KPoint = 1 VNĐ), ACID + khoá
  // row ví, idempotent theo txnId (unique constraint trên WalletTransaction).
  // Nhận payload thô (Record<string, unknown>, không qua class-validator DTO
  // — xem payments.controller.ts) và tự kiểm tra từng field ở đây: payload
  // bên thứ 3 có thể thêm/đổi field bất cứ lúc nào, validate chặt bằng DTO
  // từng khiến cả request bị 400 chỉ vì 1 field lạ, SePay không retry và phía
  // mình không log được gì để debug.
  async handleSepayWebhook(payload: Record<string, unknown>) {
    this.logger.log(`SePay webhook received: ${JSON.stringify(payload)}`);

    if (payload.transferType && payload.transferType !== 'in') {
      return { status: 200, credited: false, reason: 'not_inbound' };
    }

    const content = typeof payload.content === 'string' ? payload.content : '';
    const normalizedContent = content.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const match = normalizedContent.match(
      new RegExp(`${SEPAY_CONTENT_PREFIX}([A-Z0-9]{${TOPUP_CODE_LENGTH}})`),
    );
    if (!match) {
      this.logger.warn(`SePay webhook: không tìm thấy topupCode trong content="${content}"`);
      return { status: 200, credited: false, reason: 'no_topup_code_found' };
    }
    const topupCode = match[1]!;

    const rawId = payload.id;
    const txnId =
      rawId !== undefined && rawId !== null && rawId !== ''
        ? String(rawId)
        : typeof payload.referenceCode === 'string'
          ? payload.referenceCode
          : '';
    if (!txnId) {
      this.logger.warn('SePay webhook: thiếu id/referenceCode — không có khoá idempotency');
      return { status: 200, credited: false, reason: 'missing_txn_id' };
    }

    const rawAmount = payload.transferAmount;
    const amountNum = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      this.logger.warn(`SePay webhook: transferAmount không hợp lệ (${String(rawAmount)})`);
      return { status: 200, credited: false, reason: 'invalid_amount' };
    }
    const amount = BigInt(Math.trunc(amountNum));

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { topupCode }, select: { id: true } });
        if (!user) {
          this.logger.warn(`SePay webhook: topupCode="${topupCode}" không khớp user nào`);
          return { status: 200, credited: false, reason: 'topup_code_not_found' };
        }

        // Row lock ví trước khi cộng (P2-07) — nhất quán với mọi thao tác ví
        // khác trong hệ thống, dù increment đơn lẻ vốn đã atomic ở DB.
        await tx.$queryRaw`SELECT id FROM wallets WHERE user_id = ${user.id} FOR UPDATE`;
        await tx.wallet.update({
          where: { userId: user.id },
          data: { balanceKpoint: { increment: amount } },
        });
        await tx.walletTransaction.create({
          data: {
            userId: user.id,
            type: WalletTxType.TOPUP_SEPAY,
            side: WalletTxSide.SHARED,
            balanceDeltaKpoint: amount,
            txnId,
            note: content,
          },
        });

        this.logger.log(
          `SePay webhook: đã cộng ${amount} KPoint cho user=${user.id} (txnId=${txnId})`,
        );
        return { status: 200, credited: true };
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        // txnId đã xử lý trước đó — SePay retry webhook, ack 200 không cộng lại.
        this.logger.warn(`SePay webhook: txnId="${txnId}" đã xử lý trước đó, bỏ qua`);
        return { status: 200, credited: false, reason: 'duplicate_txn' };
      }
      throw err;
    }
  }

  // P2-08 — lập lệnh rút tiền: khoá (reserve) số KPoint yêu cầu, trạng thái
  // PENDING. Duyệt/chuyển tiền thật là P7-09 (ngoài phạm vi Phase 2).
  async createWithdrawal(userId: string, dto: CreateWithdrawalDto) {
    const amount = BigInt(dto.amountKpoint);

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ balance_kpoint: bigint; reserved_kpoint: bigint }[]>`
        SELECT balance_kpoint, reserved_kpoint FROM wallets WHERE user_id = ${userId} FOR UPDATE
      `;
      const wallet = rows[0];
      if (!wallet) throw new NotFoundException('Không tìm thấy ví KPoint của bạn');

      const available = wallet.balance_kpoint - wallet.reserved_kpoint;
      if (amount < MIN_WITHDRAWAL_KPOINT) {
        throw new BadRequestException(
          `Số KPoint rút tối thiểu ${MIN_WITHDRAWAL_KPOINT.toLocaleString('vi-VN')}`,
        );
      }
      if (available < amount) {
        throw new BadRequestException(
          `Số dư khả dụng không đủ để rút. Cần ${amount.toLocaleString('vi-VN')} KPoint, ví chỉ còn ${available.toLocaleString('vi-VN')} KPoint khả dụng.`,
        );
      }

      await tx.wallet.update({
        where: { userId },
        data: { reservedKpoint: { increment: amount } },
      });
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId,
          amountKpoint: amount,
          bankId: dto.bankId,
          bankAccountNumber: dto.bankAccountNumber,
          bankAccountName: dto.bankAccountName,
        },
      });
      await tx.walletTransaction.create({
        data: {
          userId,
          type: WalletTxType.WITHDRAWAL_REQUEST,
          side: WalletTxSide.SHARED,
          reservedDeltaKpoint: amount,
          note: `Lệnh rút về ${dto.bankId} - ${dto.bankAccountNumber}`,
        },
      });

      return this.toPublicWithdrawal(withdrawal);
    });
  }

  async listWithdrawals(userId: string) {
    const withdrawals = await this.prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return withdrawals.map((w) => this.toPublicWithdrawal(w));
  }

  // CMS "Yêu cầu rút tiền" — danh sách để Admin/Root Admin duyệt. Mặc định
  // (không truyền status) hiện PENDING trước — đây là hàng chờ xử lý, không
  // phải lịch sử.
  async listAllWithdrawals(status?: WithdrawalStatus) {
    const withdrawals = await this.prisma.withdrawal.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      include: { user: { select: { id: true, email: true } } },
    });
    return withdrawals.map((w) => ({ ...this.toPublicWithdrawal(w), user: w.user }));
  }

  // Duyệt/Từ chối lệnh rút (P7-09). APPROVE: trừ thật balance_kpoint +
  // reserved_kpoint, ghi WITHDRAWAL_COMPLETED. REJECT: chỉ giải phóng
  // reserved_kpoint (hoàn lại khả dụng cho user), ghi WITHDRAWAL_REJECTED.
  // Lock cả ví + row Withdrawal trong 1 transaction, re-check status PENDING
  // để chặn duyệt trùng (2 admin cùng bấm) hoặc duyệt lệnh đã xử lý.
  async decideWithdrawal(adminId: string, withdrawalId: string, dto: DecideWithdrawalDto) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { id: string; user_id: string; amount_kpoint: bigint; status: WithdrawalStatus }[]
      >`SELECT id, user_id, amount_kpoint, status FROM withdrawals WHERE id = ${withdrawalId} FOR UPDATE`;
      const withdrawal = rows[0];
      if (!withdrawal) throw new NotFoundException('Không tìm thấy lệnh rút');
      if (withdrawal.status !== WithdrawalStatus.PENDING) {
        throw new BadRequestException('Lệnh rút này đã được xử lý trước đó');
      }

      await tx.$queryRaw`SELECT id FROM wallets WHERE user_id = ${withdrawal.user_id} FOR UPDATE`;

      if (dto.decision === 'APPROVE') {
        await tx.wallet.update({
          where: { userId: withdrawal.user_id },
          data: {
            balanceKpoint: { decrement: withdrawal.amount_kpoint },
            reservedKpoint: { decrement: withdrawal.amount_kpoint },
          },
        });
        await tx.walletTransaction.create({
          data: {
            userId: withdrawal.user_id,
            type: WalletTxType.WITHDRAWAL_COMPLETED,
            side: WalletTxSide.SHARED,
            balanceDeltaKpoint: -withdrawal.amount_kpoint,
            reservedDeltaKpoint: -withdrawal.amount_kpoint,
            note: dto.note || 'Admin đã duyệt lệnh rút',
          },
        });
      } else {
        await tx.wallet.update({
          where: { userId: withdrawal.user_id },
          data: { reservedKpoint: { decrement: withdrawal.amount_kpoint } },
        });
        await tx.walletTransaction.create({
          data: {
            userId: withdrawal.user_id,
            type: WalletTxType.WITHDRAWAL_REJECTED,
            side: WalletTxSide.SHARED,
            reservedDeltaKpoint: -withdrawal.amount_kpoint,
            note: dto.note || 'Admin đã từ chối lệnh rút',
          },
        });
      }

      const updated = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status:
            dto.decision === 'APPROVE' ? WithdrawalStatus.APPROVED : WithdrawalStatus.REJECTED,
        },
      });

      this.logger.log(
        `Admin ${adminId} ${dto.decision === 'APPROVE' ? 'đã duyệt' : 'đã từ chối'} lệnh rút ${withdrawalId}`,
      );

      return this.toPublicWithdrawal(updated);
    });
  }

  // P2-09 — lịch sử giao dịch, lọc theo Bên A/Bên B khi FE truyền `side`
  // (SHARED luôn hiện ở cả 2 bên — nạp/rút không thuộc riêng bên nào).
  async listTransactions(userId: string, side?: 'A' | 'B') {
    const transactions = await this.prisma.walletTransaction.findMany({
      where: {
        userId,
        ...(side ? { side: { in: [side, WalletTxSide.SHARED] } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return transactions.map((t) => this.toPublicTransaction(t));
  }

  private toPublicWallet(wallet: { balanceKpoint: bigint; reservedKpoint: bigint }) {
    return {
      balanceKpoint: wallet.balanceKpoint.toString(),
      reservedKpoint: wallet.reservedKpoint.toString(),
      availableKpoint: (wallet.balanceKpoint - wallet.reservedKpoint).toString(),
    };
  }

  private toPublicWithdrawal<T extends { amountKpoint: bigint }>(withdrawal: T) {
    const { amountKpoint, ...rest } = withdrawal;
    return { ...rest, amountKpoint: amountKpoint.toString() };
  }

  private toPublicTransaction<
    T extends { balanceDeltaKpoint: bigint; reservedDeltaKpoint: bigint },
  >(tx: T) {
    const { balanceDeltaKpoint, reservedDeltaKpoint, ...rest } = tx;
    return {
      ...rest,
      balanceDeltaKpoint: balanceDeltaKpoint.toString(),
      reservedDeltaKpoint: reservedDeltaKpoint.toString(),
    };
  }
}
