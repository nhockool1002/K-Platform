import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { TrustScoreService } from '../trust-score/trust-score.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import type { SwitchModeDto } from './dto/switch-mode.dto.js';
import type { AccessTokenPayload, RefreshTokenPayload } from './token.types.js';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 phút

function ageInYears(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly trustScore: TrustScoreService,
    private readonly audit: AuditService,
  ) {}

  private signTokens(user: { id: string; email: string; role: string; activeMode: string }) {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as AccessTokenPayload['role'],
      activeMode: user.activeMode as AccessTokenPayload['activeMode'],
    };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: ACCESS_TOKEN_TTL,
    });

    const refreshPayload: RefreshTokenPayload = { sub: user.id, type: 'refresh' };
    const refreshToken = this.jwt.sign(refreshPayload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: REFRESH_TOKEN_TTL,
    });

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp');
    }
    const age = ageInYears(new Date(dto.dateOfBirth));
    if (age < 16 || age > 120) {
      throw new BadRequestException('Ngày sinh không hợp lệ (phải từ 16 tuổi trở lên)');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email đã được đăng ký');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        activeMode: dto.activeMode ?? 'A',
        fullName: dto.fullName.trim(),
        phone: dto.phone,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        province: dto.province,
        occupation: dto.occupation?.trim() || null,
      },
    });

    await this.prisma.wallet.create({
      data: { userId: user.id, balanceKpoint: 0n, reservedKpoint: 0n },
    });

    const tokens = this.signTokens(user);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // CMS Quản Trị Tài Khoản — tài khoản bị vô hiệu hoá không đăng nhập được,
    // bất kể mật khẩu đúng (khác serviceActivatedAt chỉ gate tạo Campaign).
    if (user.disabledAt) {
      throw new UnauthorizedException(
        'Tài khoản của bạn đã bị vô hiệu hoá. Vui lòng liên hệ quản trị viên.',
      );
    }

    await this.audit.recordLogin(user.id, user.role);
    const updatedUser = await this.updateLoginStreak(user);
    const tokens = this.signTokens(updatedUser);
    return { user: this.toPublicUser(updatedUser), ...tokens };
  }

  // B-05 — "đăng nhập liên tục 7 ngày" (+ điểm Trust Score). Tính theo ngày
  // lịch (không phải 24h kể từ lần trước) — nhiều lần đăng nhập cùng 1 ngày
  // không đổi chuỗi; cách nhau đúng 1 ngày thì +1; cách hơn 1 ngày thì reset
  // về 1. Đạt 7 thì thưởng điểm + reset về 0 để có thể lặp lại chu kỳ sau.
  private async updateLoginStreak(user: {
    id: string;
    lastLoginAt: Date | null;
    loginStreakDays: number;
  }) {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    let streak = user.loginStreakDays;
    if (!user.lastLoginAt) {
      streak = 1;
    } else {
      const diffDays = Math.round(
        (startOfDay(now).getTime() - startOfDay(user.lastLoginAt).getTime()) / 86_400_000,
      );
      if (diffDays === 0) {
        // Đã đăng nhập hôm nay rồi — giữ nguyên chuỗi, chỉ cập nhật mốc giờ.
      } else if (diffDays === 1) {
        streak += 1;
      } else {
        streak = 1;
      }
    }

    const completedStreak = streak >= 7;
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now, loginStreakDays: completedStreak ? 0 : streak },
    });

    if (completedStreak) {
      await this.trustScore
        .applyRule(user.id, 'ONLINE_STREAK_7D', `streak-complete:${now.toISOString().slice(0, 10)}`)
        .catch(() => {});
    }

    return updated;
  }

  async refresh(refreshToken: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }

    return this.signTokens(user);
  }

  // FN-AUTH-01: đổi activeMode và phát hành access token mới — KHÔNG yêu cầu
  // đăng nhập lại, refresh token (phiên) được giữ nguyên.
  async switchMode(userId: string, dto: SwitchModeDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { activeMode: dto.targetRole },
    });

    const { accessToken } = this.signTokens(user);
    return { success: true, activeRole: user.activeMode, accessToken };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }
    return this.toPublicUser(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Không tiết lộ email có tồn tại hay không — luôn trả về cùng 1 thông báo.
    if (!user) {
      return { message: 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi.' };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    this.mail.sendPasswordResetEmail(user.email, resetUrl);

    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    return {
      message: 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi.',
      // Chỉ trả token ở môi trường dev/staging để test thủ công khi chưa có SMTP thật.
      ...(isProd ? {} : { devResetToken: rawToken }),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    role: string;
    activeMode: string;
    trustScore: number;
    serviceActivatedAt: Date | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      activeMode: user.activeMode,
      trustScore: user.trustScore,
      serviceActivated: user.serviceActivatedAt !== null,
    };
  }
}
