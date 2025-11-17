import { IsNotEmpty, MinLength } from 'class-validator';
export class ResetDto {
  @IsNotEmpty()
  token: string;

  @MinLength(8)
  newPassword: string;
}
