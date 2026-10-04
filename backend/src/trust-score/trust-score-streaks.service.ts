import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubmissionStatus } from '../prisma/client.js';
import { TrustScoreService } from './trust-score.service.js';

// B-05 — "hoàn thành 3 proof trong 1 tuần, 5 proof trong 1 tuần và được phê
// duyệt" thì + điểm Trust Score. Chạy mỗi thứ Hai 00:00, quét 7 ngày vừa
// qua — chỉ thưởng mức CAO NHẤT đạt được (không cộng dồn cả 2 mức cùng 1 tuần).
@Injectable()
export class TrustScoreStreaksService {
  private readonly logger = new Logger(TrustScoreStreaksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trustScore: TrustScoreService,
  ) {}

  @Cron(CronExpression.EVERY_WEEK)
  async run(): Promise<void> {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    // Nhãn tuần ổn định dùng để chống thưởng trùng nếu cron chạy lặp (idempotent) —
    // không cần bảng dedup riêng, chỉ cần tra TrustScoreTransaction.note đã có chưa.
    const weekTag = `week-ending:${now.toISOString().slice(0, 10)}`;

    // Submission.status=APPROVED là trạng thái cuối (terminal) — updatedAt
    // của 1 dòng APPROVED chính là thời điểm được duyệt, không bị ghi đè bởi
    // bất kỳ thao tác nào sau đó (xem submissions.service.ts: approve()).
    const grouped = await this.prisma.submission.groupBy({
      by: ['publisherId'],
      where: { status: SubmissionStatus.APPROVED, updatedAt: { gte: weekStart, lt: now } },
      _count: true,
    });

    let awarded = 0;
    for (const g of grouped) {
      const ruleCode = g._count >= 5 ? 'WEEKLY_5_PROOFS' : g._count >= 3 ? 'WEEKLY_3_PROOFS' : null;
      if (!ruleCode) continue;

      const already = await this.prisma.trustScoreTransaction.findFirst({
        where: { userId: g.publisherId, ruleCode, note: weekTag },
      });
      if (already) continue;

      await this.trustScore.applyRule(g.publisherId, ruleCode, weekTag);
      awarded += 1;
    }

    if (awarded > 0) {
      this.logger.log(`Trust Score streak tuần ${weekTag}: thưởng ${awarded} tài khoản`);
    }
  }
}
