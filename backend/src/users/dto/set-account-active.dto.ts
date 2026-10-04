import { IsBoolean } from 'class-validator';

export class SetAccountActiveDto {
  @IsBoolean({ message: 'active phải là boolean' })
  active!: boolean;
}
