import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SepayConfigService } from '../../settings/sepay-config.service.js';

// P2-05/FN-PAY-01 — SePay gọi webhook với header `Authorization: Apikey <key>`
// khi chọn chế độ xác thực "API Key" trên dashboard SePay. Key lấy từ CMS
// "Cài đặt SePay" (SepayConfigService — DB trước, env SEPAY_WEBHOOK_API_KEY
// là fallback), không hard-code hay đọc thẳng ConfigService ở đây.
@Injectable()
export class SepayWebhookGuard implements CanActivate {
  constructor(private readonly sepayConfig: SepayConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const config = await this.sepayConfig.getConfig();
    const authHeader: string | undefined = request.headers.authorization;
    const provided = authHeader?.replace(/^Apikey\s+/i, '').trim();

    if (!config) {
      throw new UnauthorizedException(
        'Cổng SePay chưa được cấu hình — vào CMS "Cài Đặt > Cài đặt SePay" để thiết lập',
      );
    }
    if (!provided || provided !== config.webhookApiKey) {
      throw new UnauthorizedException('SePay webhook API key không hợp lệ');
    }
    return true;
  }
}
