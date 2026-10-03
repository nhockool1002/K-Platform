import { randomBytes } from 'node:crypto';
import { extname } from 'node:path';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Request } from 'express';
import { SubmissionsService } from './submissions.service.js';
import { SubmitProofDto } from './dto/submit-proof.dto.js';
import { DecideProofDto } from './dto/decide-proof.dto.js';
import { PROOFS_DIR } from './upload-paths.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';

const ALLOWED_MIME = /^(image|video)\//;
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB — đủ cho ảnh chụp màn hình + clip ngắn.

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  // P4-03 (FN-TASK-01) — chỉ Bên B (activeMode B) được nộp Proof.
  @UseGuards(JwtAuthGuard)
  @Post(':id/proof')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: PROOFS_DIR,
        filename: (req: Request, file, cb) => {
          const id = (req.params as { id: string }).id;
          const unique = randomBytes(6).toString('hex');
          cb(null, `${id}-${Date.now()}-${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        cb(null, ALLOWED_MIME.test(file.mimetype));
      },
      limits: { fileSize: MAX_FILE_BYTES },
    }),
  )
  submitProof(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: SubmitProofDto,
  ) {
    assertActiveMode(user, 'B', 'nộp Proof');
    if (!file) {
      throw new BadRequestException('Thiếu file ảnh/video Proof hoặc định dạng không hợp lệ');
    }
    return this.submissions.submitProof(id, user.sub, file, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  listMine(@CurrentUser() user: AccessTokenPayload) {
    assertActiveMode(user, 'B', 'xem nhiệm vụ của bạn');
    return this.submissions.listMine(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOne(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.submissions.getOne(id, user.sub);
  }

  // P4-10 — chỉ Bên A (chủ Campaign, kiểm tra trong service) được quyết định.
  @UseGuards(JwtAuthGuard)
  @Patch(':id/decision')
  decideProof(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: DecideProofDto,
  ) {
    assertActiveMode(user, 'A', 'duyệt/từ chối Proof');
    return this.submissions.decideProof(id, user.sub, dto.action);
  }
}

function assertActiveMode(user: AccessTokenPayload, mode: 'A' | 'B', action: string) {
  if (user.activeMode !== mode) {
    const label = mode === 'A' ? 'Bên A (Advertiser)' : 'Bên B (Publisher)';
    throw new ForbiddenException(`Chỉ ${label} mới được ${action}. Hãy Switch Mode trước.`);
  }
}
