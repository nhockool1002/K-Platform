import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { WalletTxSide, WalletTxType } from '../prisma/client.js';
import type { CreateWithdrawalDto } from './dto/create-withdrawal.dto.js';
import type { SepayWebhookDto } from './dto/sepay-webhook.dto.js';

const MIN_WITHDRAWAL_KPOINT = 50_000n;

// Tiền tố nội dung chuyển khoản SePay — theo quy ước dự án (khác hậu tố
// "KPOINT <UserID>" ban đầu trong SRS, đổi theo yêu cầu thực tế).
const SEPAY_CONTENT_PREFIX = 'KLP';

// Bỏ 0/O và 1/I để tránh nhầm lẫn khi người dùng gõ tay lại nội dung chuyển
// khoản từ app ngân hàng (không phải lúc nào cũng quét QR được).
const TOPUP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TOPUP_CODE_LENGTH = 8;

function generateTopupCode(): string {
  const bytes = randomBytes(TOPUP_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < TOPUP_CODE_LENGTH; i++) {
    code += TOPUP_CODE_ALPHABET[bytes[i]! % TOPUP_CODE_ALPHABET.length];
  }
  return code;
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Không tìm thấy ví KPoint của bạn');
    return this.toPublicWallet(wallet);
  }

  // P2-04 (FN-PAY-01) — QR tĩnh theo user: nội dung `KLP_<topupCode>`, sinh
  // lười (lazy) lần đầu user vào ví thay vì lúc đăng ký.
  async getTopupQr(userId: string) {
    const bankId = this.config.get<string>('SEPAY_BANK_ID');
    const accountNumber = this.config.get<string>('SEPAY_BANK_ACCOUNT_NUMBER');
    const accountName = this.config.get<string>('SEPAY_BANK_ACCOUNT_NAME');
    if (!bankId || !accountNumber || !accountName) {
      throw new BadRequestException(
        'Cổng SePay chưa được cấu hình (thiếu biến môi trường SEPAY_BANK_*)',
      );
    }

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
  async handleSepayWebhook(payload: SepayWebhookDto) {
    if (payload.transferType && payload.transferType !== 'in') {
      return { status: 200, credited: false, reason: 'not_inbound' };
    }

    const normalizedContent = (payload.content ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const match = normalizedContent.match(
      new RegExp(`${SEPAY_CONTENT_PREFIX}([A-Z0-9]{${TOPUP_CODE_LENGTH}})`),
    );
    if (!match) {
      return { status: 200, credited: false, reason: 'no_topup_code_found' };
    }
    const topupCode = match[1]!;

    const txnId = String(payload.id);
    const amount = BigInt(payload.transferAmount);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { topupCode }, select: { id: true } });
        if (!user) {
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
            note: payload.content,
          },
        });

        return { status: 200, credited: true };
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        // txnId đã xử lý trước đó — SePay retry webhook, ack 200 không cộng lại.
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
