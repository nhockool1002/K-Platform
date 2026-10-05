import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomBytes } from 'node:crypto';
import { ProfileService } from './profile.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';
import { AVATARS_DIR } from '../submissions/upload-paths.js';
import { assertFileContent, extForMime } from '../common/uploads.js';

const AVATAR_MIME = /^image\/(png|jpeg|webp)$/;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get('me')
  getMe(@CurrentUser() user: AccessTokenPayload) {
    return this.profile.getMe(user.sub);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdateProfileDto) {
    return this.profile.updateMe(user.sub, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: AVATARS_DIR,
        filename: (_req, file, cb) =>
          cb(null, `${randomBytes(12).toString('hex')}${extForMime(file.mimetype) ?? ''}`),
      }),
      fileFilter: (_req, file, cb) => cb(null, AVATAR_MIME.test(file.mimetype)),
      limits: { fileSize: MAX_AVATAR_BYTES },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: AccessTokenPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Ảnh đại diện phải là PNG, JPG hoặc WEBP, tối đa 2MB');
    }
    await assertFileContent(file.path, file.mimetype);
    return this.profile.setAvatar(user.sub, file.filename);
  }
}
