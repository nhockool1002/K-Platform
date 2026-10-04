import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../prisma/client.js';

// B-05 — Sổ cái Trust Score. Không giới hạn trần 100 điểm (yêu cầu gốc —
// phục vụ bảng Top Trust Score), không có sàn — ngưỡng khoá tài khoản do
// Admin tự xét qua CMS Quản Trị Tài Khoản, không enforce cứng trong code.
@Injectable()
export class TrustScoreService {
  constructor(private readonly prisma: PrismaService) {}

  // Hàm lõi — mọi đường cộng/trừ điểm (tự động hoặc Admin chỉnh tay) đều đi
  // qua đây để luôn ghi đúng 1 dòng TrustScoreTransaction song song với việc
  // cập nhật users.trust_score, trong cùng 1 transaction ACID.
  async adjust(
    params: {
      userId: string;
      delta: number;
      ruleCode?: string;
      note?: string;
      actorId?: string | null;
    },
    outerTx?: Prisma.TransactionClient,
  ) {
    const run = async (tx: Prisma.TransactionClient) => {
      const updated = await tx.user.update({
        where: { id: params.userId },
        data: { trustScore: { increment: params.delta } },
        select: { id: true, trustScore: true },
      });
      await tx.trustScoreTransaction.create({
        data: {
          userId: params.userId,
          delta: params.delta,
          ruleCode: params.ruleCode,
          note: params.note,
          actorId: params.actorId ?? null,
        },
      });
      return updated;
    };
    return outerTx ? run(outerTx) : this.prisma.$transaction(run);
  }

  // Dùng bởi các trigger tự động trong code (Dispute thua, Proof bị từ chối,
  // chuỗi ngày...) — đọc points từ TrustScoreRule thay vì hard-code số, để
  // Admin chỉnh được từ CMS mà không cần sửa code. Rule bị tắt (active=false)
  // hoặc không tồn tại → bỏ qua êm, không throw (không chặn luồng nghiệp vụ
  // chính vì lý do điểm thưởng).
  async applyRule(
    userId: string,
    ruleCode: string,
    note?: string,
    outerTx?: Prisma.TransactionClient,
  ) {
    const client = outerTx ?? this.prisma;
    const rule = await client.trustScoreRule.findUnique({ where: { code: ruleCode } });
    if (!rule || !rule.active) return null;
    return this.adjust({ userId, delta: rule.points, ruleCode, note }, outerTx);
  }

  async getHistory(userId: string, limit = 50) {
    return this.prisma.trustScoreTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { actor: { select: { id: true, email: true } } },
    });
  }

  // "sẽ có top thống kê theo điểm trust" — chỉ xếp hạng USER thường (Tài
  // khoản người dùng/Dịch vụ), không lẫn Moderator/Admin/Root Admin.
  async getLeaderboard(limit = 10) {
    return this.prisma.user.findMany({
      where: { role: 'USER' },
      orderBy: { trustScore: 'desc' },
      take: limit,
      select: { id: true, email: true, trustScore: true },
    });
  }

  async manualAdjust(
    actorId: string,
    userId: string,
    delta: number,
    ruleCode?: string,
    note?: string,
  ) {
    if (delta === 0) throw new BadRequestException('Số điểm điều chỉnh phải khác 0');
    return this.adjust({ userId, delta, ruleCode, note, actorId });
  }
}
