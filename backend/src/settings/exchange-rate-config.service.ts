import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../prisma/client.js';

// B-02 — tỷ giá mặc định khi chưa có Admin nào cấu hình (chưa có dòng nào
// trong exchange_rate_history). Chuẩn bị trước cho nạp quốc tế qua BMC
// (Phase 6) — chưa có màn hình BMC thật, nhưng tỷ giá + lịch sử đã sẵn sàng.
const DEFAULT_USD_TO_VND = 26_300;
// Mặc định thời gian Admin đối soát nạp quốc tế — ~1 tuần (B-04).
const DEFAULT_REVIEW_DAYS = 7;
const REVIEW_DAYS_SETTING_KEY = 'international_payment';

interface InternationalPaymentValue {
  reviewDays?: number;
}

// CMS "Cài Đặt" → "Cài đặt thanh toán" (tab "Quốc tế"). Tỷ giá lưu append-
// only ở bảng riêng exchange_rate_history (không phải SystemSetting) để giữ
// được lịch sử đầy đủ cho thống kê sau này — "tỷ giá hiện hành" luôn là dòng
// mới nhất theo createdAt. KHÔNG update dòng cũ, chỉ insert dòng mới.
@Injectable()
export class ExchangeRateConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentRate(): Promise<{ usdToVnd: number; updatedAt: Date | null }> {
    const latest = await this.prisma.exchangeRateHistory.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!latest) {
      return { usdToVnd: DEFAULT_USD_TO_VND, updatedAt: null };
    }
    return { usdToVnd: Number(latest.usdToVnd), updatedAt: latest.createdAt };
  }

  // Dùng khi duyệt 1 giao dịch BMC cụ thể (Phase 6) — tra tỷ giá đang hiệu
  // lực tại 1 thời điểm trong quá khứ (vd. lúc user nạp), không phải tỷ giá
  // hiện tại, để hiển thị đúng cột "Tỷ giá áp dụng" trong bảng duyệt.
  async getRateAt(at: Date): Promise<number> {
    const row = await this.prisma.exchangeRateHistory.findFirst({
      where: { createdAt: { lte: at } },
      orderBy: { createdAt: 'desc' },
    });
    return row ? Number(row.usdToVnd) : DEFAULT_USD_TO_VND;
  }

  async setRate(userId: string, usdToVnd: number) {
    await this.prisma.exchangeRateHistory.create({
      data: { usdToVnd, updatedById: userId },
    });
    return this.getCurrentRate();
  }

  async listHistory(limit = 50) {
    return this.prisma.exchangeRateHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { updatedBy: { select: { id: true, email: true } } },
    });
  }

  async getReviewDays(): Promise<number> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: REVIEW_DAYS_SETTING_KEY },
    });
    const value = row?.value as InternationalPaymentValue | undefined;
    return value?.reviewDays !== undefined && value.reviewDays > 0
      ? value.reviewDays
      : DEFAULT_REVIEW_DAYS;
  }

  async setReviewDays(userId: string, reviewDays: number): Promise<number> {
    const value: InternationalPaymentValue = { reviewDays };
    await this.prisma.systemSetting.upsert({
      where: { key: REVIEW_DAYS_SETTING_KEY },
      create: {
        key: REVIEW_DAYS_SETTING_KEY,
        value: value as unknown as Prisma.InputJsonValue,
        updatedById: userId,
      },
      update: { value: value as unknown as Prisma.InputJsonValue, updatedById: userId },
    });
    return this.getReviewDays();
  }
}
