import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// P2-05/FN-PAY-01 — SePay gọi webhook với header `Authorization: Apikey <key>`
// khi chọn chế độ xác thực "API Key" trên dashboard SePay. Khác JwtAuthGuard:
// đây là secret tĩnh cấu hình qua env (SEPAY_WEBHOOK_API_KEY), không phải JWT.
@Injectable()
export class SepayWebhookGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const expected = this.config.get<string>('SEPAY_WEBHOOK_API_KEY');
    const authHeader: string | undefined = request.headers.authorization;
    const provided = authHeader?.replace(/^Apikey\s+/i, '').trim();

    if (!expected) {
      throw new UnauthorizedException('SEPAY_WEBHOOK_API_KEY chưa được cấu hình trên server');
    }
    if (!provided || provided !== expected) {
      throw new UnauthorizedException('SePay webhook API key không hợp lệ');
    }
    return true;
  }
}
