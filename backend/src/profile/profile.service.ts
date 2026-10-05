import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import { AVATARS_DIR } from '../submissions/upload-paths.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';

const PROFILE_SELECT = {
  id: true,
  email: true,
  role: true,
  activeMode: true,
  trustScore: true,
  serviceActivatedAt: true,
  fullName: true,
  phone: true,
  dateOfBirth: true,
  gender: true,
  province: true,
  occupation: true,
  bio: true,
  avatarUrl: true,
} as const;

function ageInYears(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return {
      ...user,
      serviceActivated: user.serviceActivatedAt !== null,
      serviceActivatedAt: undefined,
    };
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    if (dto.dateOfBirth) {
      const age = ageInYears(new Date(dto.dateOfBirth));
      if (age < 16 || age > 120) {
        throw new BadRequestException('Ngày sinh không hợp lệ (phải từ 16 tuổi trở lên)');
      }
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName?.trim(),
        phone: dto.phone,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        province: dto.province,
        occupation: dto.occupation === undefined ? undefined : dto.occupation.trim() || null,
        bio: dto.bio === undefined ? undefined : dto.bio.trim() || null,
      },
    });
    return this.getMe(userId);
  }

  async setAvatar(userId: string, filename: string) {
    const previous = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    const avatarUrl = `/uploads/avatars/${filename}`;
    await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl } });

    if (previous?.avatarUrl?.startsWith('/uploads/avatars/')) {
      await unlink(join(AVATARS_DIR, basename(previous.avatarUrl))).catch(() => undefined);
    }
    return this.getMe(userId);
  }
}
