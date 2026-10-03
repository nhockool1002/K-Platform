import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CampaignStatus, SubmissionStatus, WalletTxSide, WalletTxType } from '../prisma/client.js';
import { CREATION_FEE_KPOINT } from '../campaigns/campaigns.service.js';

export type ReportPeriod = 'day' | 'month' | 'year' | 'all';

const PERIOD_LABEL: Record<ReportPeriod, string> = {
  day: 'Hôm nay',
  month: 'Tháng này',
  year: 'Năm này',
  all: 'Toàn thời gian',
};

function periodStart(period: ReportPeriod): Date | undefined {
  const now = new Date();
  switch (period) {
    case 'day':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    case 'all':
      return undefined;
  }
}

// issue #55 — CMS "Thống kê doanh thu". Hệ thống hiện KHÔNG có ví riêng cho
// nền tảng (K-Platform không giữ 1 Wallet nào) — "doanh thu" ở đây được định
// nghĩa là tổng các khoản phí mà hệ thống đã/sẽ thu của Tài khoản Dịch vụ:
//  - Phí tạo Campaign (cố định CREATION_FEE_KPOINT/campaign, tính theo số
//    Campaign được TẠO trong kỳ — khoản này bị khoá vào reserved_kpoint lúc
//    tạo, KHÔNG có đường giải phóng nên coi như đã "thu" ngay từ lúc tạo).
//  - Phí kích hoạt Tài khoản Dịch vụ (ACCOUNT_ACTIVATION, số tiền thật đã
//    trừ khỏi balance_kpoint, đọc trực tiếp từ sổ cái WalletTransaction).
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(period: ReportPeriod) {
    const gte = periodStart(period);
    const createdAtFilter = gte ? { createdAt: { gte } } : {};

    const [revenue, escrow, topEscrowOwners, topTopupUsers, topEarners] = await Promise.all([
      this.getRevenue(createdAtFilter),
      this.getEscrow(),
      this.getTopEscrowOwners(createdAtFilter),
      this.getTopUsersByTxSum(
        { type: WalletTxType.TOPUP_SEPAY, ...createdAtFilter },
        'balanceDeltaKpoint',
      ),
      this.getTopUsersByTxSum(
        { type: WalletTxType.TASK_REWARD, side: WalletTxSide.B, ...createdAtFilter },
        'balanceDeltaKpoint',
      ),
    ]);

    return {
      period,
      periodLabel: PERIOD_LABEL[period],
      revenue,
      escrow,
      topEscrowOwners,
      topTopupUsers,
      topEarners,
    };
  }

  private async getRevenue(createdAtFilter: { createdAt?: { gte: Date } }) {
    const campaignCount = await this.prisma.campaign.count({ where: createdAtFilter });
    const campaignCreationFeeKpoint = CREATION_FEE_KPOINT * BigInt(campaignCount);

    const activationAgg = await this.prisma.walletTransaction.aggregate({
      where: { type: WalletTxType.ACCOUNT_ACTIVATION, ...createdAtFilter },
      _sum: { balanceDeltaKpoint: true },
      _count: true,
    });
    // balanceDeltaKpoint ghi âm (tiền rời ví) — đảo dấu để ra số dương "đã thu".
    const activationFeeKpoint = -(activationAgg._sum.balanceDeltaKpoint ?? 0n);

    return {
      campaignCreationFeeKpoint: campaignCreationFeeKpoint.toString(),
      campaignCount,
      activationFeeKpoint: activationFeeKpoint.toString(),
      activationCount: activationAgg._count,
      totalKpoint: (campaignCreationFeeKpoint + activationFeeKpoint).toString(),
    };
  }

  // Snapshot hiện tại (không theo period — "đang giữ" là trạng thái tức
  // thời) + danh sách Campaign ACTIVE để Admin xem đã ký quỹ bao nhiêu/Campaign.
  private async getEscrow() {
    const [walletAgg, campaigns] = await Promise.all([
      this.prisma.wallet.aggregate({ _sum: { reservedKpoint: true } }),
      this.prisma.campaign.findMany({
        where: { status: CampaignStatus.ACTIVE },
        include: {
          owner: { select: { email: true } },
          _count: { select: { submissions: { where: { status: SubmissionStatus.APPROVED } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const campaignRows = campaigns.map((c) => {
      const approvedSlots = c._count.submissions;
      // Đã ký quỹ lúc tạo (CREATION_FEE + totalSlots*rewardPerSlot), trừ đi
      // phần đã giải phóng cho các slot đã Approve (approve() trừ đúng
      // reservedKpoint theo rewardPerSlot — xem submissions.service.ts).
      const lockedKpoint =
        CREATION_FEE_KPOINT +
        BigInt(c.totalSlots) * c.rewardPerSlot -
        BigInt(approvedSlots) * c.rewardPerSlot;
      return {
        id: c.id,
        title: c.title,
        ownerEmail: c.owner.email,
        totalSlots: c.totalSlots,
        approvedSlots,
        lockedKpoint: lockedKpoint.toString(),
      };
    });
    campaignRows.sort((a, b) => (BigInt(b.lockedKpoint) > BigInt(a.lockedKpoint) ? 1 : -1));

    return {
      totalReservedKpoint: (walletAgg._sum.reservedKpoint ?? 0n).toString(),
      campaigns: campaignRows,
    };
  }

  // Top 10 Tài khoản Dịch vụ ký quỹ nhiều nhất trong kỳ (theo Campaign tạo
  // trong kỳ) — không có cột tổng sẵn trên Campaign nên gộp bằng JS thay vì
  // SQL thô, đủ nhanh ở quy mô admin dashboard.
  private async getTopEscrowOwners(createdAtFilter: { createdAt?: { gte: Date } }) {
    const campaigns = await this.prisma.campaign.findMany({
      where: createdAtFilter,
      select: {
        ownerId: true,
        totalSlots: true,
        rewardPerSlot: true,
        owner: { select: { email: true } },
      },
    });

    const byOwner = new Map<
      string,
      { email: string; totalKpoint: bigint; campaignCount: number }
    >();
    for (const c of campaigns) {
      const cost = CREATION_FEE_KPOINT + BigInt(c.totalSlots) * c.rewardPerSlot;
      const entry = byOwner.get(c.ownerId) ?? {
        email: c.owner.email,
        totalKpoint: 0n,
        campaignCount: 0,
      };
      entry.totalKpoint += cost;
      entry.campaignCount += 1;
      byOwner.set(c.ownerId, entry);
    }

    return [...byOwner.entries()]
      .map(([userId, v]) => ({
        userId,
        email: v.email,
        totalKpoint: v.totalKpoint.toString(),
        campaignCount: v.campaignCount,
      }))
      .sort((a, b) => (BigInt(b.totalKpoint) > BigInt(a.totalKpoint) ? 1 : -1))
      .slice(0, 10);
  }

  // Top 10 user theo tổng balanceDeltaKpoint dương của 1 loại giao dịch
  // trong kỳ — dùng chung cho "Top nạp KPoint" (TOPUP_SEPAY) và "Top Earning"
  // (TASK_REWARD side=B).
  private async getTopUsersByTxSum(
    where: { type: WalletTxType; side?: WalletTxSide; createdAt?: { gte: Date } },
    sumField: 'balanceDeltaKpoint',
  ) {
    const grouped = await this.prisma.walletTransaction.groupBy({
      by: ['userId'],
      where,
      _sum: { [sumField]: true },
      orderBy: { _sum: { [sumField]: 'desc' } },
      take: 10,
    });

    const userIds = grouped.map((g) => g.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    const emailById = new Map(users.map((u) => [u.id, u.email]));

    return grouped.map((g) => ({
      userId: g.userId,
      email: emailById.get(g.userId) ?? '(không rõ)',
      totalKpoint: (g._sum[sumField] ?? 0n).toString(),
    }));
  }
}
