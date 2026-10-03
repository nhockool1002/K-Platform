import {
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
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import type { SwitchModeDto } from './dto/switch-mode.dto.js';
import type { AccessTokenPayload, RefreshTokenPayload } from './token.types.js';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 phút

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
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

    const tokens = this.signTokens(user);
    return { user: this.toPublicUser(user), ...tokens };
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
