import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import {
  InternationalPaymentsService,
  newReceiptFilename,
} from './international-payments.service.js';
import { CreateBmcTopupDto } from './dto/create-bmc-topup.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';
import { BMC_RECEIPTS_DIR } from '../submissions/upload-paths.js';
import { assertFileContent } from '../common/uploads.js';

const ALLOWED_RECEIPT_MIME = /^(image\/(png|jpeg|webp)|application\/pdf)$/;
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

@Controller('payments/bmc')
@UseGuards(JwtAuthGuard)
export class InternationalPaymentsController {
  constructor(private readonly payments: InternationalPaymentsService) {}

  @Get('packages')
  listPackages() {
    return this.payments.listPackagesForUser();
  }

  @Post('topups')
  initiate(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateBmcTopupDto) {
    return this.payments.initiate(user.sub, dto.packageId);
  }

  @Get('topups')
  listMine(@CurrentUser() user: AccessTokenPayload) {
    return this.payments.listMine(user.sub);
  }

  @Post('topups/:id/receipt')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: BMC_RECEIPTS_DIR,
        filename: (_req, file, cb) => cb(null, newReceiptFilename(file.mimetype)),
      }),
      fileFilter: (_req, file, cb) => {
        cb(null, ALLOWED_RECEIPT_MIME.test(file.mimetype));
      },
      limits: { fileSize: MAX_RECEIPT_BYTES },
    }),
  )
  async uploadReceipt(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Thiếu biên lai hoặc định dạng không hợp lệ (ảnh PNG/JPG/WEBP hoặc PDF, tối đa 5MB)',
      );
    }
    await assertFileContent(file.path, file.mimetype);
    return this.payments.attachReceipt(user.sub, id, file.filename);
  }
}
