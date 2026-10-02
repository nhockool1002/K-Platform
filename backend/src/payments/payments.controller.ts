import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto.js';
import { SepayWebhookDto } from './dto/sepay-webhook.dto.js';
import { SepayWebhookGuard } from './guards/sepay-webhook.guard.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('wallet')
  getWallet(@CurrentUser() user: AccessTokenPayload) {
    return this.payments.getWallet(user.sub);
  }

  // P2-04 (FN-PAY-01) — QR VietQR + nội dung chuyển khoản của chính user.
  @UseGuards(JwtAuthGuard)
  @Get('sepay-qr')
  getSepayQr(@CurrentUser() user: AccessTokenPayload) {
    return this.payments.getTopupQr(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  listTransactions(@CurrentUser() user: AccessTokenPayload, @Query('side') side?: string) {
    const normalized = side === 'A' || side === 'B' ? side : undefined;
    return this.payments.listTransactions(user.sub, normalized);
  }

  @UseGuards(JwtAuthGuard)
  @Post('withdrawals')
  createWithdrawal(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateWithdrawalDto) {
    return this.payments.createWithdrawal(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('withdrawals')
  listWithdrawals(@CurrentUser() user: AccessTokenPayload) {
    return this.payments.listWithdrawals(user.sub);
  }

  // P2-05 — public endpoint, xác thực bằng SepayWebhookGuard (API Key), không
  // phải JWT. Luôn trả 200 kể cả khi không cộng điểm (content không khớp user
  // nào, hoặc đã xử lý trước đó) — trả lỗi 4xx/5xx sẽ khiến SePay coi là thất
  // bại và retry liên tục không cần thiết.
  @UseGuards(SepayWebhookGuard)
  @Post('sepay-webhook')
  @HttpCode(200)
  sepayWebhook(@Body() dto: SepayWebhookDto) {
    return this.payments.handleSepayWebhook(dto);
  }
}
