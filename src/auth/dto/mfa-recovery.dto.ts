import { IsString } from 'class-validator';

export class MfaRecoverDto {
  @IsString()
  mfaToken: string;

  @IsString()
  code: string;  // e.g., "C3E0-9B29-2A69"
}
