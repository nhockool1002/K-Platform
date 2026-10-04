import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DisputeStatus, SubmissionStatus, UserRole } from '../prisma/client.js';
import { SubmissionsService } from '../submissions/submissions.service.js';
import { DisputeSlaConfigService } from '../settings/dispute-sla-config.service.js';
import { TrustScoreService } from '../trust-score/trust-score.service.js';
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
    private readonly disputeSla: DisputeSlaConfigService,
    private readonly trustScore: TrustScoreService,
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
    const [disputes, sla] = await Promise.all([
      this.prisma.disputeTicket.findMany({
        where: status ? { status } : undefined,
        include: DISPUTE_INCLUDE,
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      }),
      this.disputeSla.getConfig(),
    ]);
    return disputes.map((d) => this.toPublicDetailed(d, sla));
  }

  async getOne(id: string) {
    const [dispute, sla] = await Promise.all([
      this.prisma.disputeTicket.findUnique({ where: { id }, include: DISPUTE_INCLUDE }),
      this.disputeSla.getConfig(),
    ]);
    if (!dispute) throw new NotFoundException('Không tìm thấy Dispute');
    return this.toPublicDetailed(dispute, sla);
  }

  // FN-DISP-02 — Moderator thẩm định, chỉ chuyển trạng thái đề xuất, KHÔNG
  // được tự duyệt chi (P5-06 — guard thật ở RolesGuard của route resolve()
  // chỉ cho ADMIN/ROOT_ADMIN, Moderator không gọi được, xem P5-12).
  // P7-08/P7-10 — nếu Campaign liên quan đã được phân công cho 1 Moderator cụ
  // thể, Moderator KHÁC không được đề xuất (đúng README § II "Super/Moderator:
  // Quản lý Campaign được phân công"). Admin/Root Admin luôn được phép (toàn
  // quyền), và Campaign chưa phân công (null) vẫn mở cho mọi Moderator để
  // Dispute không bị kẹt không ai nhận.
  async recommend(modId: string, actorRole: UserRole, disputeId: string, dto: RecommendDisputeDto) {
    const dispute = await this.prisma.disputeTicket.findUnique({
      where: { id: disputeId },
      include: { submission: { select: { campaign: { select: { assignedModeratorId: true } } } } },
    });
    if (!dispute) throw new NotFoundException('Không tìm thấy Dispute');
    if (dispute.status !== DisputeStatus.OPEN) {
      throw new BadRequestException('Dispute này đã được đề xuất hoặc xử lý trước đó');
    }

    const assignedModeratorId = dispute.submission.campaign.assignedModeratorId;
    if (actorRole === UserRole.MODERATOR && assignedModeratorId && assignedModeratorId !== modId) {
      throw new ForbiddenException('Campaign này đã được phân công cho Moderator khác quản lý');
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
  //
  // B-03 "leo thang" — nếu Dispute đã quá hạn SLA Moderator (mặc định 12h)
  // mà vẫn còn OPEN (chưa ai đề xuất), Admin được phép phán quyết THẲNG, bỏ
  // qua bước chờ đề xuất — tránh Dispute bị kẹt vì Moderator không xử lý kịp.
  async resolve(adminId: string, disputeId: string, dto: ResolveDisputeDto) {
    const sla = await this.disputeSla.getConfig();

    return this.prisma.$transaction(async (tx) => {
      const dispute = await tx.disputeTicket.findUnique({ where: { id: disputeId } });
      if (!dispute) throw new NotFoundException('Không tìm thấy Dispute');

      const moderatorDeadline = new Date(
        dispute.createdAt.getTime() + sla.moderatorHours * 60 * 60 * 1000,
      );
      const isEscalated = dispute.status === DisputeStatus.OPEN && new Date() > moderatorDeadline;

      if (dispute.status !== DisputeStatus.RECOMMENDED && !isEscalated) {
        throw new BadRequestException(
          'Dispute này chưa có đề xuất từ Moderator, chưa thể phán quyết',
        );
      }

      let publisherId: string;
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
        publisherId = (result as { publisherId: string }).publisherId;
      } else {
        // Thắng Bên A — giữ nguyên quyết định từ chối ban đầu, slot được mở
        // lại cho ứng viên khác (REJECTED không còn nằm trong SLOT_OCCUPYING_STATUSES).
        const updatedSubmission = await tx.submission.update({
          where: { id: dispute.submissionId },
          data: { status: SubmissionStatus.REJECTED },
          select: { publisherId: true },
        });
        publisherId = updatedSubmission.publisherId;
      }

      const updated = await tx.disputeTicket.update({
        where: { id: disputeId },
        data: { adminId, finalDecision: dto.decision, status: DisputeStatus.RESOLVED },
      });

      // B-05 — Bên B thua Dispute (Admin xử REJECT = giữ nguyên từ chối của
      // Tài khoản Dịch vụ) thì trừ Trust Score. Thắng (APPROVE) không + điểm
      // riêng — phần thưởng của họ là được trả KPoint, không nhân đôi qua
      // Trust Score (tránh vòng lặp "thắng dispute được lợi 2 lần").
      if (dto.decision === 'REJECT') {
        await this.trustScore.applyRule(publisherId, 'DISPUTE_LOST', `dispute:${disputeId}`, tx);
      }

      this.logger.log(
        `Dispute ${disputeId}: Admin ${adminId} phán quyết ${dto.decision}${isEscalated ? ' (leo thang do quá hạn Moderator)' : ''} — thông báo Bên A & Bên B (mock)`,
      );
      return {
        disputeId: updated.id,
        resolved: true,
        decision: dto.decision,
        escalated: isEscalated,
      };
    });
  }

  private toPublicSummary<T extends Record<string, unknown>>(dispute: T) {
    return dispute;
  }

  // Campaign.rewardPerSlot là BigInt — serialize về string giống mọi public
  // response khác trong hệ thống (toPublicCampaign/toPublicWallet...). Kèm
  // tính toán hạn SLA (B-03/04) để CMS hiện badge "Quá hạn".
  private toPublicDetailed<
    T extends {
      status: string;
      createdAt: Date;
      submission: { campaign: { rewardPerSlot: bigint } & Record<string, unknown> } & Record<
        string,
        unknown
      >;
    },
  >(dispute: T, sla: { moderatorHours: number; adminHours: number }) {
    const { campaign, ...restSubmission } = dispute.submission;
    const { rewardPerSlot, ...restCampaign } = campaign;
    const moderatorDeadline = new Date(
      dispute.createdAt.getTime() + sla.moderatorHours * 60 * 60 * 1000,
    );
    const adminDeadline = new Date(dispute.createdAt.getTime() + sla.adminHours * 60 * 60 * 1000);
    const now = new Date();
    return {
      ...dispute,
      submission: {
        ...restSubmission,
        campaign: { ...restCampaign, rewardPerSlot: rewardPerSlot.toString() },
      },
      sla: {
        moderatorDeadline,
        adminDeadline,
        isOverdueModerator: dispute.status === 'OPEN' && now > moderatorDeadline,
        isOverdueAdmin: dispute.status !== 'RESOLVED' && now > adminDeadline,
      },
    };
  }
}
