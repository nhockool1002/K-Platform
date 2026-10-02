import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
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

// Phí khởi tạo cố định (FN-CAMP-01 / README.md § 9.4).
const CREATION_FEE_KPOINT = 50_000n;

// Slot coi như "đã chiếm" (không còn mở cho người khác ứng tuyển) kể từ lúc
// được Invite trở đi — APPLIED/REJECTED_APPLICATION không tính vào đây.
const SLOT_OCCUPYING_STATUSES: SubmissionStatus[] = [
  SubmissionStatus.INVITED,
  SubmissionStatus.PENDING,
  SubmissionStatus.APPROVED,
];

// Trạng thái hiển thị ở màn "Quản lý Campaign & Appliers" (SCR-05) — ứng viên
// đang chờ Bên A xử lý hoặc đã xử lý gần đây, trước khi có Proof thật.
const APPLICANT_VISIBLE_STATUSES: SubmissionStatus[] = [
  SubmissionStatus.APPLIED,
  SubmissionStatus.INVITED,
  SubmissionStatus.REJECTED_APPLICATION,
];

function hashFingerprint(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  // P3-03/P3-04 (FN-CAMP-01) — tính Tổng KPoint, khoá reserved_kpoint trong 1
  // transaction ACID (row lock SELECT ... FOR UPDATE) để tránh 2 request tạo
  // Campaign đồng thời cùng đọc một số dư "đủ" rồi cùng trừ, gây lệch ví.
  async create(ownerId: string, dto: CreateCampaignDto) {
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
