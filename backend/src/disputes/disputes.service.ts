import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DisputeStatus, SubmissionStatus } from '../prisma/client.js';
import { SubmissionsService } from '../submissions/submissions.service.js';
import type { CreateDisputeDto } from './dto/create-dispute.dto.js';
import type { RecommendDisputeDto } from './dto/recommend-dispute.dto.js';
import type { ResolveDisputeDto } from './dto/resolve-dispute.dto.js';

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}

const DISPUTE_INCLUDE = {
  submission: {
    include: {
      campaign: { include: { owner: { select: { id: true, email: true } } } },
      publisher: { select: { id: true, email: true, trustScore: true } },
    },
  },
  moderator: { select: { id: true, email: true } },
  admin: { select: { id: true, email: true } },
} as const;

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly submissions: SubmissionsService,
  ) {}

  // FN-DISP-01 — Bên B tạo Khiếu nại khi Proof bị từ chối. Phong tỏa slot
  // (P5-03) bằng cách chuyển submission sang DISPUTED — campaigns.service.ts
  // coi DISPUTED là slot đang chiếm, không mở lại cho ứng viên khác trong
  // lúc chờ phán quyết (tránh trả thưởng 2 lần cho cùng 1 slot đã ký quỹ).
  async create(publisherId: string, dto: CreateDisputeDto) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: dto.submissionId },
    });
    if (!submission) throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    if (submission.publisherId !== publisherId) {
      throw new ForbiddenException('Bạn không phải chủ bài nộp này');
    }
    if (submission.status !== SubmissionStatus.REJECTED) {
      throw new BadRequestException(
        'Chỉ có thể tạo Dispute khi Proof của bạn đã bị từ chối (REJECTED)',
      );
    }

    try {
      const dispute = await this.prisma.$transaction(async (tx) => {
        const created = await tx.disputeTicket.create({
          data: { submissionId: dto.submissionId, reason: dto.reason },
        });
        await tx.submission.update({
          where: { id: dto.submissionId },
          data: { status: SubmissionStatus.DISPUTED },
        });
        return created;
      });

      // P5-09 — chưa có hạ tầng email thật (giống mock mailer P1-03), log lại
      // để Moderator biết có ticket mới chờ thẩm định.
      this.logger.log(
        `Dispute mới ${dispute.id} cho submission ${dto.submissionId} — thông báo Moderator (mock)`,
      );
      return this.toPublicSummary(dispute);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException('Đơn này đã được tạo Dispute trước đó');
      }
      throw err;
    }
  }

  // SCR-11 — CMS Dispute Center: danh sách cho Moderator/Admin.
  async list(status?: DisputeStatus) {
    const disputes = await this.prisma.disputeTicket.findMany({
      where: status ? { status } : undefined,
      include: DISPUTE_INCLUDE,
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });
    return disputes.map((d) => this.toPublicDetailed(d));
  }

  async getOne(id: string) {
    const dispute = await this.prisma.disputeTicket.findUnique({
      where: { id },
      include: DISPUTE_INCLUDE,
    });
    if (!dispute) throw new NotFoundException('Không tìm thấy Dispute');
    return this.toPublicDetailed(dispute);
  }

  // FN-DISP-02 — Moderator thẩm định, chỉ chuyển trạng thái đề xuất, KHÔNG
  // được tự duyệt chi (P5-06 — guard thật ở RolesGuard của route resolve()
  // chỉ cho ADMIN/ROOT_ADMIN, Moderator không gọi được, xem P5-12).
  async recommend(modId: string, disputeId: string, dto: RecommendDisputeDto) {
    const dispute = await this.prisma.disputeTicket.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Không tìm thấy Dispute');
    if (dispute.status !== DisputeStatus.OPEN) {
      throw new BadRequestException('Dispute này đã được đề xuất hoặc xử lý trước đó');
    }

    const updated = await this.prisma.disputeTicket.update({
      where: { id: disputeId },
      data: { modId, modRecommendation: dto.recommendation, status: DisputeStatus.RECOMMENDED },
    });

    this.logger.log(
      `Dispute ${disputeId}: Moderator ${modId} đề xuất ${dto.recommendation} — thông báo Admin (mock)`,
    );
    return this.toPublicSummary(updated);
  }

  // FN-DISP-03 — Admin phán quyết cuối cùng, giải phóng KPoint đúng bên
  // thắng (P5-08). Gộp toàn bộ (cập nhật Submission/Wallet + DisputeTicket)
  // trong 1 transaction duy nhất — truyền `tx` xuống SubmissionsService.approve()
  // thay vì gọi 2 transaction tách rời, để không bao giờ rơi vào trạng thái
  // nửa vời (tiền đã trả nhưng ticket chưa chốt RESOLVED, hoặc ngược lại).
  async resolve(adminId: string, disputeId: string, dto: ResolveDisputeDto) {
    return this.prisma.$transaction(async (tx) => {
      const dispute = await tx.disputeTicket.findUnique({ where: { id: disputeId } });
      if (!dispute) throw new NotFoundException('Không tìm thấy Dispute');
      if (dispute.status !== DisputeStatus.RECOMMENDED) {
        throw new BadRequestException(
          'Dispute này chưa có đề xuất từ Moderator, chưa thể phán quyết',
        );
      }

      if (dto.decision === 'APPROVE') {
        // Thắng Bên B — chạy lại đúng luồng trả thưởng dùng chung với duyệt
        // Proof thủ công/Auto-Approve (P4-10/P4-09), chỉ khác status nguồn
        // là DISPUTED thay vì PENDING.
        const result = await this.submissions.approve(dispute.submissionId, tx);
        if (!result) {
          throw new BadRequestException(
            'Đơn Proof liên quan vừa được xử lý xong, vui lòng tải lại trang',
          );
        }
      } else {
        // Thắng Bên A — giữ nguyên quyết định từ chối ban đầu, slot được mở
        // lại cho ứng viên khác (REJECTED không còn nằm trong SLOT_OCCUPYING_STATUSES).
        await tx.submission.update({
          where: { id: dispute.submissionId },
          data: { status: SubmissionStatus.REJECTED },
        });
      }

      const updated = await tx.disputeTicket.update({
        where: { id: disputeId },
        data: { adminId, finalDecision: dto.decision, status: DisputeStatus.RESOLVED },
      });

      this.logger.log(
        `Dispute ${disputeId}: Admin ${adminId} phán quyết ${dto.decision} — thông báo Bên A & Bên B (mock)`,
      );
      return { disputeId: updated.id, resolved: true, decision: dto.decision };
    });
  }

  private toPublicSummary<T extends Record<string, unknown>>(dispute: T) {
    return dispute;
  }

  // Campaign.rewardPerSlot là BigInt — serialize về string giống mọi public
  // response khác trong hệ thống (toPublicCampaign/toPublicWallet...).
  private toPublicDetailed<
    T extends {
      submission: { campaign: { rewardPerSlot: bigint } & Record<string, unknown> } & Record<
        string,
        unknown
      >;
    },
  >(dispute: T) {
    const { campaign, ...restSubmission } = dispute.submission;
    const { rewardPerSlot, ...restCampaign } = campaign;
    return {
      ...dispute,
      submission: {
        ...restSubmission,
        campaign: { ...restCampaign, rewardPerSlot: rewardPerSlot.toString() },
      },
    };
  }
}
