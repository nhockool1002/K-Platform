import { join } from 'node:path';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubmissionStatus, WalletTxSide, WalletTxType } from '../prisma/client.js';
import { WATERMARK_QUEUE } from '../watermark/watermark.constants.js';
import type { WatermarkJobData } from '../watermark/watermark.processor.js';
import { PROOFS_DIR, WATERMARKED_DIR } from './upload-paths.js';
import type { SubmitProofDto } from './dto/submit-proof.dto.js';

const AUTO_APPROVE_WINDOW_MS = 48 * 60 * 60 * 1000;

const MINE_VISIBLE_STATUSES: SubmissionStatus[] = [
  SubmissionStatus.INVITED,
  SubmissionStatus.PENDING,
  SubmissionStatus.APPROVED,
  SubmissionStatus.REJECTED,
];

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(WATERMARK_QUEUE) private readonly watermarkQueue: Queue<WatermarkJobData>,
  ) {}

  // P4-03/FN-TASK-01 — nộp Proof (chỉ khi đang ở trạng thái INVITED), kích
  // hoạt đồng hồ Auto-Approve 48h (P4-09) và đẩy job Watermark bất đồng bộ
  // (P4-04/05/06) thay vì xử lý đồng bộ trong request.
  async submitProof(
    submissionId: string,
    publisherId: string,
    file: Express.Multer.File,
    dto: SubmitProofDto,
  ) {
    const submission = await this.prisma.submission.findUnique({ where: { id: submissionId } });
    if (!submission) throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    if (submission.publisherId !== publisherId) {
      throw new ForbiddenException('Bạn không phải chủ bài nộp này');
    }
    if (submission.status !== SubmissionStatus.INVITED) {
      throw new BadRequestException('Chỉ có thể nộp Proof khi đơn đang ở trạng thái đã Invite');
    }

    const proofUrl = `/uploads/proofs/${file.filename}`;
    const autoApproveAt = new Date(Date.now() + AUTO_APPROVE_WINDOW_MS);

    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.PENDING,
        proofUrl,
        watermarkUrl: null,
        reviewUrl: dto.reviewUrl,
        reviewNote: dto.reviewNote,
        autoApproveAt,
      },
    });

    const kind: WatermarkJobData['kind'] = file.mimetype.startsWith('video/') ? 'video' : 'image';
    await this.watermarkQueue.add(
      'watermark',
      {
        submissionId,
        inputPath: join(PROOFS_DIR, file.filename),
        outputPath: join(WATERMARKED_DIR, file.filename),
        kind,
        watermarkText: `${publisherId.slice(0, 8)} • ${submission.campaignId.slice(0, 8)} • ${new Date().toISOString()}`,
      } satisfies WatermarkJobData,
      { attempts: 2, backoff: { type: 'exponential', delay: 2000 } },
    );

    return this.toPublic(updated);
  }

  async getOne(id: string, userId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: { campaign: true },
    });
    if (!submission) throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    if (submission.publisherId !== userId && submission.campaign.ownerId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem đơn này');
    }
    return this.toPublic(submission);
  }

  // P4-11 — Dashboard Bên B: nhiệm vụ đang làm + lịch sử, thay mockMyTasks.
  async listMine(publisherId: string) {
    const rows = await this.prisma.submission.findMany({
      where: { publisherId, status: { in: MINE_VISIBLE_STATUSES } },
      include: { campaign: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toPublic(r));
  }

  // P4-10 — quyết định thủ công của Bên A (chủ Campaign).
  async decideProof(submissionId: string, ownerId: string, action: 'APPROVE' | 'REJECT') {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { campaign: true },
    });
    if (!submission) throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    if (submission.campaign.ownerId !== ownerId) {
      throw new ForbiddenException('Bạn không phải chủ sở hữu Campaign này');
    }
    if (submission.status !== SubmissionStatus.PENDING) {
      throw new BadRequestException('Đơn Proof này đã được xử lý trước đó');
    }

    if (action === 'REJECT') {
      const updated = await this.prisma.submission.update({
        where: { id: submissionId },
        data: { status: SubmissionStatus.REJECTED },
      });
      return this.toPublic(updated);
    }

    const result = await this.approve(submissionId);
    if (!result) {
      // Giữa lúc check status ở trên và lúc approve() lấy row lock, 1 request
      // khác (vd. cronjob) đã xử lý xong — tránh báo lỗi gây hiểu nhầm.
      throw new BadRequestException('Đơn Proof này vừa được xử lý xong, vui lòng tải lại trang');
    }
    return result;
  }

  // P4-09/P4-13 — dùng chung bởi quyết định thủ công VÀ Cronjob Auto-Approve.
  // Tự khoá row + tái kiểm tra status=PENDING BÊN TRONG transaction để không
  // bao giờ trả thưởng 2 lần, kể cả khi 2 đường gọi vào gần như đồng thời.
  async approve(submissionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { id: string; status: string; campaign_id: string; publisher_id: string }[]
      >`SELECT id, status, campaign_id, publisher_id FROM submissions WHERE id = ${submissionId} FOR UPDATE`;
      const locked = rows[0];
      if (!locked) throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
      if (locked.status !== SubmissionStatus.PENDING) {
        return null;
      }

      const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: locked.campaign_id } });
      const reward = campaign.rewardPerSlot;

      // Khoá 2 ví theo thứ tự cố định (chủ Campaign trước, Publisher sau) để
      // nhiều approve() chạy song song (cron + nhiều submission) không deadlock.
      await tx.$queryRaw`SELECT id FROM wallets WHERE user_id = ${campaign.ownerId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM wallets WHERE user_id = ${locked.publisher_id} FOR UPDATE`;

      await tx.wallet.update({
        where: { userId: campaign.ownerId },
        data: { balanceKpoint: { decrement: reward }, reservedKpoint: { decrement: reward } },
      });
      await tx.wallet.update({
        where: { userId: locked.publisher_id },
        data: { balanceKpoint: { increment: reward } },
      });

      await tx.walletTransaction.create({
        data: {
          userId: campaign.ownerId,
          type: WalletTxType.TASK_REWARD,
          side: WalletTxSide.A,
          balanceDeltaKpoint: -reward,
          reservedDeltaKpoint: -reward,
          relatedCampaignId: campaign.id,
          note: `Trả thưởng Proof đã duyệt — Campaign "${campaign.title}"`,
        },
      });
      await tx.walletTransaction.create({
        data: {
          userId: locked.publisher_id,
          type: WalletTxType.TASK_REWARD,
          side: WalletTxSide.B,
          balanceDeltaKpoint: reward,
          relatedCampaignId: campaign.id,
          note: `Thưởng Proof đã duyệt — Campaign "${campaign.title}"`,
        },
      });

      const updated = await tx.submission.update({
        where: { id: submissionId },
        data: { status: SubmissionStatus.APPROVED },
      });
      return this.toPublic(updated);
    });
  }

  // `submission.update()` (không include campaign) và `findUnique({include:
  // {campaign:true}})` trả về 2 shape khác nhau — nhận `unknown`-ish và tự
  // kiểm tra runtime thay vì ép kiểu generic quá chặt.
  private toPublic<T extends Record<string, unknown>>(submission: T) {
    const campaign = submission.campaign as
      (Record<string, unknown> & { rewardPerSlot: bigint }) | null | undefined;
    if (!campaign) return submission;
    const { rewardPerSlot, ...restCampaign } = campaign;
    return {
      ...submission,
      campaign: { ...restCampaign, rewardPerSlot: rewardPerSlot.toString() },
    };
  }
}
