import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PermissionService } from '../rbac/permission.service.js';
import {
  CampaignStatus,
  SubmissionStatus,
  WalletTxSide,
  WalletTxType,
  type Prisma,
} from '../prisma/client.js';
import type { CreateCampaignDto } from './dto/create-campaign.dto.js';
import type { ApplyCampaignDto } from './dto/apply-campaign.dto.js';
import type { ApplicantActionDto } from './dto/applicant-action.dto.js';
import type { ListCampaignsQueryDto } from './dto/list-campaigns-query.dto.js';
import type { UpdateCampaignAdminDto } from './dto/update-campaign-admin.dto.js';

// Phí khởi tạo cố định (FN-CAMP-01 / README.md § 9.4). Export để
// ReportsService dùng chung khi tính doanh thu phí tạo Campaign (issue #55)
// — tránh định nghĩa trùng, lệch giá trị giữa 2 nơi.
export const CREATION_FEE_KPOINT = 50_000n;

// Slot coi như "đã chiếm" (không còn mở cho người khác ứng tuyển) kể từ lúc
// được Invite trở đi — APPLIED/REJECTED_APPLICATION không tính vào đây.
// DISPUTED (P5-03/FN-DISP-01) — phong tỏa slot khi Bên B khiếu nại Proof bị
// từ chối: slot KHÔNG được mở lại cho ứng viên khác trong lúc chờ Moderator/
// Admin phán quyết, tránh 2 người cùng được trả thưởng từ 1 slot đã ký quỹ.
// Chỉ khi Dispute RESOLVED thắng Bên A (submission về lại REJECTED) slot mới
// thật sự mở lại.
// Export để ReportsService tái dùng khi tính slotsFilled cho Overview (P7-01).
export const SLOT_OCCUPYING_STATUSES: SubmissionStatus[] = [
  SubmissionStatus.INVITED,
  SubmissionStatus.PENDING,
  SubmissionStatus.APPROVED,
  SubmissionStatus.DISPUTED,
];

// Trạng thái hiển thị ở màn "Quản lý Campaign & Appliers" (SCR-05) — ứng viên
// đang chờ Bên A xử lý hoặc đã xử lý gần đây, trước khi có Proof thật.
const APPLICANT_VISIBLE_STATUSES: SubmissionStatus[] = [
  SubmissionStatus.APPLIED,
  SubmissionStatus.INVITED,
  SubmissionStatus.REJECTED_APPLICATION,
  // P4-10 — "Quản lý Campaign & Ứng Viên" (SCR-05) tiếp tục hiển thị các đơn
  // đã bước sang giai đoạn nộp Proof, để Bên A duyệt/từ chối trên cùng 1 màn.
  SubmissionStatus.PENDING,
  SubmissionStatus.APPROVED,
  SubmissionStatus.REJECTED,
  // Phase 5 — vẫn hiện trên SCR-05 khi đang tranh chấp để Bên A theo dõi.
  SubmissionStatus.DISPUTED,
];

function hashFingerprint(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

// Số KPoint ký quỹ của các slot chưa bị chiếm — đây là phần hoàn lại khi lưu trữ.
function refundableKpoint(totalSlots: number, occupied: number, rewardPerSlot: bigint): bigint {
  return BigInt(Math.max(0, totalSlots - occupied)) * rewardPerSlot;
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
  ) {}

  // P3-03/P3-04 (FN-CAMP-01) — tính Tổng KPoint, khoá reserved_kpoint trong 1
  // transaction ACID (row lock SELECT ... FOR UPDATE) để tránh 2 request tạo
  // Campaign đồng thời cùng đọc một số dư "đủ" rồi cùng trừ, gây lệch ví.
  async create(ownerId: string, dto: CreateCampaignDto) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { serviceActivatedAt: true },
    });
    if (!owner?.serviceActivatedAt) {
      throw new ForbiddenException(
        'Tài khoản Dịch vụ của bạn chưa được kích hoạt. Vui lòng kích hoạt để tạo Campaign.',
      );
    }

    const totalCost = CREATION_FEE_KPOINT + BigInt(dto.totalSlots) * BigInt(dto.rewardPerSlot);

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ balance_kpoint: bigint; reserved_kpoint: bigint }[]>`
        SELECT balance_kpoint, reserved_kpoint FROM wallets WHERE user_id = ${ownerId} FOR UPDATE
      `;
      const wallet = rows[0];
      if (!wallet) {
        throw new NotFoundException('Không tìm thấy ví KPoint của bạn');
      }

      const available = wallet.balance_kpoint - wallet.reserved_kpoint;
      if (available < totalCost) {
        throw new BadRequestException(
          `Số dư khả dụng không đủ để tạo Campaign. Cần khoá ${totalCost.toLocaleString('vi-VN')} KPoint, ví chỉ còn ${available.toLocaleString('vi-VN')} KPoint khả dụng.`,
        );
      }

      await tx.wallet.update({
        where: { userId: ownerId },
        data: { reservedKpoint: { increment: totalCost } },
      });

      const campaign = await tx.campaign.create({
        data: {
          ownerId,
          title: dto.title,
          platform: dto.platform,
          location: dto.location,
          totalSlots: dto.totalSlots,
          rewardPerSlot: BigInt(dto.rewardPerSlot),
          dripFeedLimit: dto.dripFeedLimit,
          minTrustScore: dto.minTrustScore ?? 0,
          surveyQuestions: dto.surveyQuestions
            ? (dto.surveyQuestions as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      });

      // P2-09 — ghi sổ cái để Bên A xem được lịch sử ký quỹ Campaign ở Ví.
      await tx.walletTransaction.create({
        data: {
          userId: ownerId,
          type: WalletTxType.CAMPAIGN_RESERVE,
          side: WalletTxSide.A,
          reservedDeltaKpoint: totalCost,
          relatedCampaignId: campaign.id,
          note: `Ký quỹ tạo Campaign "${dto.title}"`,
        },
      });

      return this.toPublicCampaign(campaign);
    });
  }

  // P3-05/P3-06 (SCR-01) — danh sách public, chỉ Campaign đang ACTIVE.
  async listPublic(query: ListCampaignsQueryDto) {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        status: CampaignStatus.ACTIVE,
        ...(query.platform ? { platform: query.platform } : {}),
        ...(query.search
          ? {
              OR: [
                { title: { contains: query.search, mode: 'insensitive' } },
                { location: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { submissions: { where: { status: { in: SLOT_OCCUPYING_STATUSES } } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map((c) => this.toPublicCampaign(c));
  }

  // P3-07 — Dashboard Bên A: toàn bộ Campaign của owner (mọi trạng thái).
  async listMine(ownerId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { ownerId },
      include: {
        _count: {
          select: {
            submissions: { where: { status: { in: SLOT_OCCUPYING_STATUSES } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map((c) => this.toPublicCampaign(c));
  }

  async getOne(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        _count: { select: { submissions: { where: { status: { in: SLOT_OCCUPYING_STATUSES } } } } },
      },
    });
    if (!campaign) throw new NotFoundException('Không tìm thấy Campaign');
    return this.toPublicCampaign(campaign);
  }

  // P3-09/P3-10/P3-11 (FN-CAMP-02) — Ứng tuyển Survey: kiểm tra Trust Score,
  // Fingerprint, IP trước khi ghi nhận ứng tuyển.
  async apply(campaignId: string, publisherId: string, ip: string | null, dto: ApplyCampaignDto) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Không tìm thấy Campaign');
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Campaign này không còn nhận ứng tuyển');
    }

    const publisher = await this.prisma.user.findUnique({
      where: { id: publisherId },
      select: { trustScore: true },
    });
    if (!publisher) throw new NotFoundException('Không tìm thấy tài khoản của bạn');
    if (publisher.trustScore < campaign.minTrustScore) {
      throw new ForbiddenException(
        `Trust Score của bạn (${publisher.trustScore}) chưa đạt yêu cầu tối thiểu (${campaign.minTrustScore}) của Campaign này`,
      );
    }

    const occupiedSlots = await this.prisma.submission.count({
      where: { campaignId, status: { in: SLOT_OCCUPYING_STATUSES } },
    });
    if (occupiedSlots >= campaign.totalSlots) {
      throw new BadRequestException('Campaign đã hết slot');
    }

    const fingerprintHash = hashFingerprint(dto.fingerprint);

    // P3-10 — chặn multi-account: 1 thiết bị (fingerprint) không được ứng
    // tuyển cùng 1 Campaign bằng 2 tài khoản khác nhau.
    const fingerprintClash = await this.prisma.submission.findFirst({
      where: { campaignId, fingerprintHash, publisherId: { not: publisherId } },
    });
    if (fingerprintClash) {
      throw new ConflictException(
        'Thiết bị này đã được dùng để ứng tuyển Campaign này bằng một tài khoản khác',
      );
    }

    // P3-11 — chặn multi-account qua IP, tương tự fingerprint.
    if (ip) {
      const ipClash = await this.prisma.submission.findFirst({
        where: { campaignId, ip, publisherId: { not: publisherId } },
      });
      if (ipClash) {
        throw new ConflictException(
          'Địa chỉ IP này đã được dùng để ứng tuyển Campaign này bằng một tài khoản khác',
        );
      }
    }

    try {
      return await this.prisma.submission.create({
        data: {
          campaignId,
          publisherId,
          surveyAnswers: dto.surveyAnswers as unknown as Prisma.InputJsonValue,
          fingerprintHash,
          ip: ip ?? undefined,
          status: SubmissionStatus.APPLIED,
        },
      });
    } catch (err) {
      // Unique([campaignId, publisherId]) — tài khoản này đã ứng tuyển rồi.
      if (isUniqueConstraintError(err)) {
        throw new ConflictException('Bạn đã ứng tuyển Campaign này rồi');
      }
      throw err;
    }
  }

  // P3-08 (SCR-05) — danh sách ứng viên cho chủ Campaign.
  async listApplicants(campaignId: string, ownerId: string) {
    await this.assertOwner(campaignId, ownerId);

    return this.prisma.submission.findMany({
      where: { campaignId, status: { in: APPLICANT_VISIBLE_STATUSES } },
      include: {
        publisher: { select: { id: true, email: true, trustScore: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // P3-12 — Invite/Reject ứng viên.
  async decideApplicant(
    campaignId: string,
    submissionId: string,
    ownerId: string,
    dto: ApplicantActionDto,
  ) {
    await this.assertOwner(campaignId, ownerId);
    await this.assertNotArchived(campaignId);

    const submission = await this.prisma.submission.findUnique({ where: { id: submissionId } });
    if (!submission || submission.campaignId !== campaignId) {
      throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    }
    if (submission.status !== SubmissionStatus.APPLIED) {
      throw new BadRequestException('Đơn ứng tuyển này đã được xử lý trước đó');
    }

    return this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        status:
          dto.action === 'INVITE'
            ? SubmissionStatus.INVITED
            : SubmissionStatus.REJECTED_APPLICATION,
      },
      include: {
        publisher: { select: { id: true, email: true, trustScore: true } },
      },
    });
  }

  // P3-13 — Campaign cũ không thể xoá, chỉ Archive. Không có API/DELETE nào
  // khác xoá Campaign trong toàn bộ module này.
  async archive(campaignId: string, ownerId: string) {
    await this.assertOwner(campaignId, ownerId);
    const campaign = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.ARCHIVED },
    });
    return this.toPublicCampaign(campaign);
  }

  // SCR-21 — chi tiết Campaign cho CMS, kèm số slot đã chiếm và số KPoint sẽ
  // hoàn về khả dụng nếu lưu trữ ngay bây giờ (xem archiveForAdmin).
  async getAdminDetail(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        owner: { select: { id: true, email: true, disabledAt: true } },
        assignedModerator: { select: { id: true, email: true } },
        submissions: { select: { status: true } },
      },
    });
    if (!campaign) throw new NotFoundException('Không tìm thấy Campaign');

    const { submissions, rewardPerSlot, ...rest } = campaign;
    const slotsOccupied = submissions.filter((s) =>
      SLOT_OCCUPYING_STATUSES.includes(s.status),
    ).length;
    const statusCounts: Record<string, number> = {};
    for (const s of submissions) statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1;

    const refundable =
      campaign.status === CampaignStatus.ACTIVE
        ? refundableKpoint(campaign.totalSlots, slotsOccupied, rewardPerSlot)
        : 0n;

    return {
      ...rest,
      rewardPerSlot: rewardPerSlot.toString(),
      slotsOccupied,
      statusCounts,
      refundableKpoint: refundable.toString(),
    };
  }

  // SCR-21 — sửa thông tin hiển thị. Campaign đã lưu trữ không sửa nữa.
  async updateForAdmin(campaignId: string, dto: UpdateCampaignAdminDto) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Không tìm thấy Campaign');
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Campaign đã lưu trữ, không thể sửa');
    }
    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        title: dto.title,
        location: dto.location,
        minTrustScore: dto.minTrustScore,
      },
    });
    return this.toPublicCampaign(updated);
  }

  // SCR-21 — lưu trữ Campaign do Admin/Mod thực hiện ("xoá" trong CMS = lưu
  // trữ, không xoá cứng). Hoàn ký quỹ của các slot CHƯA chiếm về khả dụng
  // (reserved_kpoint giảm, balance_kpoint không đổi). Slot đang INVITED/PENDING/
  // DISPUTED/APPROVED vẫn giữ nguyên để trả thưởng khi duyệt như bình thường.
  async archiveForAdmin(campaignId: string) {
    return this.prisma.$transaction(async (tx) => {
      const owner = await tx.campaign.findUnique({
        where: { id: campaignId },
        select: { ownerId: true },
      });
      if (!owner) throw new NotFoundException('Không tìm thấy Campaign');

      // Khoá ví chủ Campaign trước khi đọc số slot, để không bị lệch với
      // Invite/Approve đang chạy song song (cùng khoá ví chủ Campaign).
      await tx.$queryRaw`SELECT id FROM wallets WHERE user_id = ${owner.ownerId} FOR UPDATE`;

      const campaign = await tx.campaign.findUniqueOrThrow({
        where: { id: campaignId },
        include: { submissions: { select: { status: true } } },
      });
      if (campaign.status !== CampaignStatus.ACTIVE) {
        throw new BadRequestException('Campaign đã được lưu trữ trước đó');
      }

      const occupied = campaign.submissions.filter((s) =>
        SLOT_OCCUPYING_STATUSES.includes(s.status),
      ).length;
      const refund = refundableKpoint(campaign.totalSlots, occupied, campaign.rewardPerSlot);
      const freeSlots = Math.max(0, campaign.totalSlots - occupied);

      if (refund > 0n) {
        await tx.wallet.update({
          where: { userId: campaign.ownerId },
          data: { reservedKpoint: { decrement: refund } },
        });
        await tx.walletTransaction.create({
          data: {
            userId: campaign.ownerId,
            type: WalletTxType.CAMPAIGN_REFUND,
            side: WalletTxSide.A,
            reservedDeltaKpoint: -refund,
            relatedCampaignId: campaign.id,
            note: `Lưu trữ Campaign "${campaign.title}" — hoàn ký quỹ ${freeSlots} slot chưa dùng`,
          },
        });
      }

      const archived = await tx.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.ARCHIVED },
      });
      return {
        ...this.toPublicCampaign(archived),
        refundedKpoint: refund.toString(),
        refundedSlots: freeSlots,
      };
    });
  }

  private async assertNotArchived(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });
    if (campaign?.status === CampaignStatus.ARCHIVED) {
      throw new BadRequestException('Campaign đã lưu trữ, không thể xử lý thêm ứng viên');
    }
  }

  // P7-01/SCR-09/SCR-12 — danh sách rút gọn cho CMS (RBAC phân công Moderator
  // + Overview "Chiến Dịch Mới Kích Hoạt"), không giới hạn theo owner.
  async listAllForAdmin() {
    const campaigns = await this.prisma.campaign.findMany({
      include: {
        owner: { select: { id: true, email: true } },
        assignedModerator: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return campaigns.map((c) => {
      const { rewardPerSlot, ...rest } = c;
      return { ...rest, rewardPerSlot: rewardPerSlot.toString() };
    });
  }

  // P7-08/SCR-12 — Admin/Root Admin phân công 1 Moderator cụ thể quản lý
  // Campaign này (xem bằng chứng + đề xuất Dispute thuộc Campaign này trước —
  // enforce ở DisputesService.recommend()). `moderatorId: null` = gỡ phân công.
  async assignModerator(campaignId: string, moderatorId: string | null) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Không tìm thấy Campaign');

    if (moderatorId) {
      const moderator = await this.prisma.user.findUnique({
        where: { id: moderatorId },
        select: { email: true, role: true },
      });
      if (
        !moderator ||
        (moderator.role !== 'MODERATOR' &&
          moderator.role !== 'ADMIN' &&
          moderator.role !== 'ROOT_ADMIN')
      ) {
        throw new BadRequestException('Tài khoản được phân công phải có vai trò Moderator/Admin');
      }
      const canManage = await this.permissions.can(moderatorId, 'campaigns', 'UPDATE');
      if (!canManage) {
        throw new BadRequestException(
          `Tài khoản ${moderator.email} chưa được cấp quyền "Quản trị Campaign" (Sửa). Vui lòng yêu cầu Quản trị viên cấp quyền này trong Phân quyền trước khi phân công Campaign.`,
        );
      }
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { assignedModeratorId: moderatorId },
      include: {
        owner: { select: { id: true, email: true } },
        assignedModerator: { select: { id: true, email: true } },
      },
    });
    return this.toPublicCampaign(updated);
  }

  private async assertOwner(campaignId: string, ownerId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Không tìm thấy Campaign');
    if (campaign.ownerId !== ownerId) {
      throw new ForbiddenException('Bạn không phải chủ sở hữu Campaign này');
    }
    return campaign;
  }

  // BigInt không serialize được qua JSON.stringify — mọi Campaign trả về từ
  // controller (dù có kèm _count hay không) đều phải đi qua hàm này.
  private toPublicCampaign<
    T extends {
      rewardPerSlot: bigint;
      _count?: { submissions: number };
    },
  >(campaign: T) {
    const { _count, rewardPerSlot, ...rest } = campaign;
    return {
      ...rest,
      rewardPerSlot: rewardPerSlot.toString(),
      slotsFilled: _count?.submissions ?? 0,
    };
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}
