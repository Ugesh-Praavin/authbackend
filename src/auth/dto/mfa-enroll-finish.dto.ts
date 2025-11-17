import { IsNotEmpty } from 'class-validator';
export class MfaEnrollFinishDto {
  @IsNotEmpty()
  secret: string;

  @IsNotEmpty()
  code: string;
}
