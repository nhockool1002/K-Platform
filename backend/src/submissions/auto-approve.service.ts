import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubmissionStatus } from '../prisma/client.js';
import { SubmissionsService } from './submissions.service.js';

// P4-09/FN-TASK-02 — quét định kỳ các Submission PENDING quá auto_approve_at
// (48h) và tự Approve + trả thưởng. Dùng chung SubmissionsService.approve()
// với luồng duyệt thủ công của Bên A — hàm đó tự khoá row + re-check status
// bên trong transaction nên chạy lặp (nhiều tick trùng 1 submission, hoặc
// trùng với Bên A bấm Approve/Reject) không bao giờ trả thưởng 2 lần (P4-13).
@Injectable()
export class AutoApproveService {
  private readonly logger = new Logger(AutoApproveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly submissions: SubmissionsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async run(): Promise<void> {
    const due = await this.prisma.submission.findMany({
      where: { status: SubmissionStatus.PENDING, autoApproveAt: { lte: new Date() } },
      select: { id: true },
    });
    if (due.length === 0) return;

    this.logger.log(`Auto-Approve: ${due.length} submission(s) quá hạn 48h`);
    for (const { id } of due) {
      try {
        await this.submissions.approve(id);
      } catch (err) {
        this.logger.error(`Auto-Approve thất bại cho submission ${id}: ${(err as Error).message}`);
      }
    }
  }
}
