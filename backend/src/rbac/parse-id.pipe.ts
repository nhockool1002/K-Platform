import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

// ID tài khoản theo dạng UUID-like. Không dùng ParseUUIDPipe vì Root Admin có ID
// hard-code (ROOT_ADMIN_ID) không đúng chuẩn variant của UUID nhưng vẫn phải truy cập được.
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ParseIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!ID_PATTERN.test(value)) throw new BadRequestException('ID không hợp lệ');
    return value;
  }
}
