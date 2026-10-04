import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateTrustScoreRuleDto } from './dto/create-trust-score-rule.dto.js';
import type { UpdateTrustScoreRuleDto } from './dto/update-trust-score-rule.dto.js';

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}

// B-05 — 5 lý do hệ thống mặc định, tự động trigger từ code (xem
// disputes.service.ts, submissions.service.ts, trust-score-streaks.service.ts,
// auth.service.ts). Chỉ tạo nếu CHƯA tồn tại (skipDuplicates theo `code`) lúc
// app khởi động — không ghi đè nếu Admin đã chỉnh `points`/`label` trước đó.
const DEFAULT_SYSTEM_RULES = [
  { code: 'DISPUTE_LOST', label: 'Thua Dispute (Bên A thắng khiếu nại)', points: -10 },
  { code: 'PROOF_REJECTED', label: 'Proof bị Tài khoản Dịch vụ từ chối', points: -5 },
  { code: 'WEEKLY_3_PROOFS', label: 'Hoàn thành 3 Proof được duyệt trong 1 tuần', points: 5 },
  { code: 'WEEKLY_5_PROOFS', label: 'Hoàn thành 5 Proof được duyệt trong 1 tuần', points: 10 },
  { code: 'ONLINE_STREAK_7D', label: 'Đăng nhập liên tục 7 ngày', points: 5 },
] as const;

// CMS — CRUD lý do +/- Trust Score. Rule hệ thống (isSystem=true) không xoá
// được (code đang được tham chiếu trong code), chỉ sửa points/label/active.
@Injectable()
export class TrustScoreRulesService implements OnModuleInit {
  private readonly logger = new Logger(TrustScoreRulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const { count } = await this.prisma.trustScoreRule.createMany({
      data: DEFAULT_SYSTEM_RULES.map((r) => ({ ...r, isSystem: true })),
      skipDuplicates: true,
    });
    if (count > 0) {
      this.logger.log(`Đã khởi tạo ${count} Trust Score rule mặc định`);
    }
  }

  list() {
    return this.prisma.trustScoreRule.findMany({
      orderBy: [{ isSystem: 'desc' }, { code: 'asc' }],
    });
  }

  async create(dto: CreateTrustScoreRuleDto) {
    try {
      return await this.prisma.trustScoreRule.create({ data: { ...dto, isSystem: false } });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException('Mã lý do này đã tồn tại');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateTrustScoreRuleDto) {
    const existing = await this.prisma.trustScoreRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy lý do');
    return this.prisma.trustScoreRule.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const existing = await this.prisma.trustScoreRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy lý do');
    if (existing.isSystem) {
      throw new BadRequestException('Không thể xóa lý do hệ thống — chỉ có thể tắt (active=false)');
    }
    await this.prisma.trustScoreRule.delete({ where: { id } });
    return { success: true };
  }
}
