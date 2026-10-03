import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { WalletTxSide, WalletTxType } from '../prisma/client.js';
import { ActivationFeeConfigService } from '../settings/activation-fee-config.service.js';

// Mở chế độ Tài khoản Dịch vụ (Switch Mode sang A) luôn miễn phí — phí ở đây
// chỉ để MỞ KHOÁ chức năng tạo Campaign (xem campaigns.service.ts: create()
// chặn nếu serviceActivatedAt === null). Thu phí 1 lần duy nhất, không hoàn.
@Injectable()
export class AccountActivationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activationFeeConfig: ActivationFeeConfigService,
  ) {}

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { serviceActivatedAt: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản của bạn');

    const feeKpoint = await this.activationFeeConfig.getFeeKpoint();
    return {
      activated: user.serviceActivatedAt !== null,
      activatedAt: user.serviceActivatedAt,
      feeKpoint: feeKpoint.toString(),
    };
  }

  async activate(userId: string) {
    const feeKpoint = await this.activationFeeConfig.getFeeKpoint();

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { serviceActivatedAt: true },
      });
      if (!user) throw new NotFoundException('Không tìm thấy tài khoản của bạn');
      if (user.serviceActivatedAt) {
        throw new BadRequestException('Tài khoản Dịch vụ của bạn đã được kích hoạt trước đó');
      }

      if (feeKpoint > 0n) {
        const rows = await tx.$queryRaw<{ balance_kpoint: bigint; reserved_kpoint: bigint }[]>`
          SELECT balance_kpoint, reserved_kpoint FROM wallets WHERE user_id = ${userId} FOR UPDATE
        `;
        const wallet = rows[0];
        if (!wallet) throw new NotFoundException('Không tìm thấy ví KPoint của bạn');

        const available = wallet.balance_kpoint - wallet.reserved_kpoint;
        if (available < feeKpoint) {
          throw new BadRequestException(
            `Số dư khả dụng không đủ để kích hoạt. Cần ${feeKpoint.toLocaleString('vi-VN')} KPoint, ví chỉ còn ${available.toLocaleString('vi-VN')} KPoint khả dụng.`,
          );
        }

        await tx.wallet.update({
          where: { userId },
          data: { balanceKpoint: { decrement: feeKpoint } },
        });
        await tx.walletTransaction.create({
          data: {
            userId,
            type: WalletTxType.ACCOUNT_ACTIVATION,
            side: WalletTxSide.A,
            balanceDeltaKpoint: -feeKpoint,
            note: 'Kích hoạt Tài khoản Dịch vụ',
          },
        });
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: { serviceActivatedAt: new Date() },
        select: { serviceActivatedAt: true },
      });

      return {
        activated: true,
        activatedAt: updated.serviceActivatedAt,
        feeKpoint: feeKpoint.toString(),
      };
    });
  }
}
