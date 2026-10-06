import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubmissionStatus, UserRole, WalletTxSide, WalletTxType } from '../prisma/client.js';
import { WATERMARK_QUEUE } from '../watermark/watermark.constants.js';
import type { WatermarkJobData } from '../watermark/watermark.processor.js';
import type { AdjustWalletDto } from './dto/cms-ops.dto.js';

// Proof đã nộp nhưng watermark chưa xong sau ngưỡng này được coi là kẹt.
const STUCK_WATERMARK_MS = 10 * 60 * 1000;

function walletView(w: { balanceKpoint: bigint; reservedKpoint: bigint }) {
  return {
    balanceKpoint: w.balanceKpoint.toString(),
    reservedKpoint: w.reservedKpoint.toString(),
    availableKpoint: (w.balanceKpoint - w.reservedKpoint).toString(),
  };
}

// CMS SCR-23/24/25 — nghiệp vụ dùng chung cho ví & sổ cái, chống gian lận và
// giám sát vận hành. Mỗi nhóm có controller + quyền riêng (xem từng controller).
@Injectable()
export class CmsOpsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(WATERMARK_QUEUE) private readonly watermarkQueue: Queue<WatermarkJobData>,
  ) {}

  // ---------- SCR-23 · Ví & sổ cái ----------

  async listWallets(search?: string) {
    const wallets = await this.prisma.wallet.findMany({
      where: search
        ? { user: { email: { contains: search.trim(), mode: 'insensitive' } } }
        : undefined,
      include: { user: { select: { id: true, email: true, role: true, disabledAt: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return wallets.map((w) => ({ id: w.id, user: w.user, ...walletView(w) }));
  }

  async listWalletTransactions(userId: string) {
    const rows = await this.prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((t) => ({
      id: t.id,
      type: t.type,
      side: t.side,
      balanceDeltaKpoint: t.balanceDeltaKpoint.toString(),
      reservedDeltaKpoint: t.reservedDeltaKpoint.toString(),
      relatedCampaignId: t.relatedCampaignId,
      note: t.note,
      createdAt: t.createdAt,
    }));
  }

  // Điều chỉnh số dư: khoá ví bằng SELECT ... FOR UPDATE để không lệch với
  // Approve/Withdraw đang chạy song song. Không cho số dư xuống dưới phần KPoint
  // đang ký quỹ/khoá (reserved), tức khả dụng luôn >= 0.
  async adjustWallet(userId: string, dto: AdjustWalletDto) {
    return this.prisma.$transaction(async (tx) => {
      const exists = await tx.wallet.findUnique({ where: { userId }, select: { id: true } });
      if (!exists) throw new NotFoundException('Người dùng chưa có ví KPoint');
      await tx.$queryRaw`SELECT id FROM wallets WHERE user_id = ${userId} FOR UPDATE`;

      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      const delta = BigInt(dto.deltaKpoint);
      const nextBalance = wallet.balanceKpoint + delta;
      if (nextBalance < wallet.reservedKpoint) {
        throw new BadRequestException(
          `Không thể trừ ${(-delta).toLocaleString('vi-VN')} KPoint: số dư sau điều chỉnh (${nextBalance.toLocaleString('vi-VN')}) sẽ thấp hơn KPoint đang ký quỹ/khoá (${wallet.reservedKpoint.toLocaleString('vi-VN')}).`,
        );
      }

      const updated = await tx.wallet.update({
        where: { userId },
        data: { balanceKpoint: nextBalance },
      });
      await tx.walletTransaction.create({
        data: {
          userId,
          type: WalletTxType.ADJUSTMENT,
          side: WalletTxSide.SHARED,
          balanceDeltaKpoint: delta,
          note: `Admin điều chỉnh số dư: ${dto.reason}`,
        },
      });
      return walletView(updated);
    });
  }

  // ---------- SCR-24 · Chống gian lận ----------

  // Cụm nghi gian lận = trong CÙNG 1 Campaign, nhiều Bên B KHÁC NHAU cùng dùng
  // 1 fingerprint thiết bị hoặc 1 IP. Đây là dấu hiệu 1 người nhiều tài khoản
  // ăn slot. Chỉ liệt kê các cụm có >1 publisher.
  async fraudClusters() {
    const rows = await this.prisma.$queryRaw<
      { kind: string; campaign_id: string; signal: string; publisher_ids: string[] }[]
    >`
      SELECT 'FINGERPRINT' AS kind, campaign_id, fingerprint_hash AS signal,
             array_agg(DISTINCT publisher_id) AS publisher_ids
      FROM submissions
      WHERE fingerprint_hash IS NOT NULL
      GROUP BY campaign_id, fingerprint_hash
      HAVING COUNT(DISTINCT publisher_id) > 1
      UNION ALL
      SELECT 'IP' AS kind, campaign_id, ip AS signal,
             array_agg(DISTINCT publisher_id) AS publisher_ids
      FROM submissions
      WHERE ip IS NOT NULL
      GROUP BY campaign_id, ip
      HAVING COUNT(DISTINCT publisher_id) > 1
      LIMIT 200
    `;
    if (rows.length === 0) return [];

    const campaignIds = [...new Set(rows.map((r) => r.campaign_id))];
    const userIds = [...new Set(rows.flatMap((r) => r.publisher_ids))];
    const [campaigns, users] = await Promise.all([
      this.prisma.campaign.findMany({
        where: { id: { in: campaignIds } },
        select: { id: true, title: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, role: true, disabledAt: true },
      }),
    ]);
    const titleById = new Map(campaigns.map((c) => [c.id, c.title]));
    const userById = new Map(users.map((u) => [u.id, u]));

    return rows.map((r) => ({
      kind: r.kind as 'FINGERPRINT' | 'IP',
      campaignId: r.campaign_id,
      campaignTitle: titleById.get(r.campaign_id) ?? null,
      // Fingerprint là hash dài — rút gọn khi hiển thị, IP giữ nguyên.
      signal: r.kind === 'IP' ? r.signal : `${r.signal.slice(0, 12)}…`,
      publishers: r.publisher_ids.map((id) => userById.get(id)).filter(Boolean),
    }));
  }

  // Khoá/mở khoá chỉ áp dụng cho tài khoản người dùng thường. Admin/Mod phải
  // xử lý ở Quản trị tài khoản để không mở đường khoá nhầm đồng nghiệp.
  async setUserDisabled(actorId: string, userId: string, disabled: boolean) {
    if (userId === actorId) {
      throw new BadRequestException('Không thể tự khoá tài khoản của chính mình');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    if (user.role !== UserRole.USER) {
      throw new BadRequestException(
        'Màn chống gian lận chỉ khoá tài khoản người dùng. Quản trị viên/Moderator xử lý ở Quản trị tài khoản.',
      );
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { disabledAt: disabled ? new Date() : null },
      select: { id: true, email: true, disabledAt: true },
    });
  }

  // ---------- SCR-25 · Giám sát vận hành ----------

  async opsStatus() {
    const now = Date.now();
    const [counts, failed, overdueAutoApprove, stuckWatermark, serverErrors24h] = await Promise.all(
      [
        this.watermarkQueue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed'),
        this.watermarkQueue.getFailed(0, 9),
        // Cronjob Auto-Approve chạy mỗi phút; Proof quá hạn mà vẫn PENDING = cron kẹt/lỗi.
        this.prisma.submission.count({
          where: {
            status: SubmissionStatus.PENDING,
            autoApproveAt: { lt: new Date(now) },
          },
        }),
        this.prisma.submission.count({
          where: {
            status: SubmissionStatus.PENDING,
            proofUrl: { not: null },
            watermarkUrl: null,
            updatedAt: { lt: new Date(now - STUCK_WATERMARK_MS) },
          },
        }),
        this.prisma.auditLog.count({
          where: {
            statusCode: { gte: 500 },
            createdAt: { gte: new Date(now - 24 * 60 * 60 * 1000) },
          },
        }),
      ],
    );

    return {
      checkedAt: new Date(now).toISOString(),
      watermarkQueue: counts,
      failedJobs: failed.map((j) => ({
        id: j.id,
        submissionId: j.data.submissionId,
        attemptsMade: j.attemptsMade,
        failedReason: j.failedReason,
        failedAt: j.finishedOn ? new Date(j.finishedOn).toISOString() : null,
      })),
      overdueAutoApprove,
      stuckWatermark,
      serverErrors24h,
    };
  }

  // Đưa toàn bộ job watermark lỗi về hàng đợi để chạy lại.
  async retryFailedWatermarkJobs() {
    const counts = await this.watermarkQueue.getJobCounts('failed');
    await this.watermarkQueue.retryJobs({ state: 'failed' });
    return { retryRequested: counts.failed ?? 0 };
  }
}
