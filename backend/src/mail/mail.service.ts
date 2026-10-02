import { Injectable, Logger } from '@nestjs/common';

// Chưa tích hợp SMTP thật (nằm ngoài phạm vi Phase 1) — log ra console để
// dev/QA lấy link reset khi test thủ công. Thay bằng provider thật (SES/Sendgrid)
// khi tới Phase 6 (thông báo email).
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  sendPasswordResetEmail(email: string, resetUrl: string): void {
    this.logger.log(`[MOCK EMAIL] Gửi link đặt lại mật khẩu tới ${email}: ${resetUrl}`);
  }
}
