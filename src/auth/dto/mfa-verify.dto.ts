import { IsNotEmpty } from 'class-validator';
export class MfaVerifyDto {
  @IsNotEmpty()
  mfaToken: string;

  @IsNotEmpty()
  code: string;
}
