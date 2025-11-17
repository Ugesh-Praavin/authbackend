import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { MfaService } from './mfa.service';
import { SessionGuard } from '../common/session.guard';
import { CurrentUser } from '../common/current-user.decorator';

@Controller('mfa')
export class MfaController {
  constructor(private mfa: MfaService) {}

  // start enrollment — returns QR data URL + secret (secret displayed only once if user can't scan)
  @UseGuards(SessionGuard)
  @Get('enroll/start')
  async start(@CurrentUser() user: any) {
    return this.mfa.startEnroll(user.id);
  }

  // finish enroll — user supplies secret (from start) and OTP code to confirm
  @UseGuards(SessionGuard)
  @Post('enroll/finish')
  async finish(@CurrentUser() user: any, @Body() body: { secret: string; code: string }) {
    return this.mfa.finishEnroll(user.id, body.secret, body.code);
  }

  // disable MFA
  @UseGuards(SessionGuard)
  @Delete('disable')
  async disable(@CurrentUser() user: any) {
    return this.mfa.disable(user.id);
  }

  // Generate / rotate recovery codes (show plaintext once)
  @UseGuards(SessionGuard)
  @Post('recovery/generate')
  async generateRecovery(@CurrentUser() user: any, @Body() body: { count?: number }) {
    const count = body?.count ?? 10;
    const codes = await this.mfa.generateRecoveryCodes(user.id, count);
    // You MUST display these codes once to the user and NOT store them on front-end logs.
    return { codes }; // plaintext only returned here — frontend should show and ask user to store securely
  }

  // Consume a recovery code during MFA login (two variants)
  // 1) If user is in 'mfa_required' login flow: frontend would call /auth/mfa/recover
  // 2) If logged in and wants to use a recovery code to disable MFA, call /mfa/recovery/use (protected)
}
