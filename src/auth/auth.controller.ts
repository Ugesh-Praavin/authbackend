import { BadRequestException, Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SessionsService } from '../sessions/sessions.service';
import type { Request, Response } from 'express';
import { ForgotDto } from './dto/forgot.dto';
import { ResetDto } from './dto/reset.dto';
import { MfaService } from '../mfa/mfa.service';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { SessionGuard } from 'src/common/session.guard';
import { CurrentUser } from 'src/common/current-user.decorator';
import { MfaRecoverDto } from './dto/mfa-recovery.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private sessions: SessionsService,
    private mfa: MfaService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('rotate')
  async rotate(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.sid;
    const { raw: nextRaw } = await this.sessions.rotate(
      raw,
      req.ip,
      req.headers['user-agent'] as string | undefined,
    );
    res.cookie('sid', nextRaw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Number(process.env.SESSION_TTL_DAYS || 30) * 24 * 60 * 60 * 1000,
    });
    return { ok: true };
  }

  @Post('logout-all')
  async logoutAll(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.sid;
    const me = await this.sessions.userFromRaw(raw);
    await this.sessions.deleteAllForUser(me.id);
    res.clearCookie('sid', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
    return { ok: true };
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.validateUser(dto);

    // --- If MFA enabled ---
    // inside login handler (after const user = await this.auth.validateUser(dto); )
if (user.mfaEnabled) {
  // create mfa challenge token and return to client
  const mfaToken = await this.mfa.createChallenge(user.id);
  return { mfa_required: true, mfa_token: mfaToken };
}

// else: create session (existing behaviour)


    // --- Otherwise normal login ---
    const { raw } = await this.sessions.createSession(
      user.id,
      req.ip,
      req.headers['user-agent'],
    );
    res.cookie('sid', raw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Number(process.env.SESSION_TTL_DAYS || 30) * 24 * 60 * 60 * 1000,
    });
    return {
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    };
  }

  @Get('me')
  async me(@Req() req: Request) {
    const raw = req.cookies?.sid;
    const user = await this.sessions.userFromRaw(raw);
    return { user };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.sid;
    if (raw) {
      await this.sessions.deleteByRaw(raw);
      res.clearCookie('sid', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }
    return { ok: true };
  }

  // --- Email verification ---
  @Get('verify')
  async verify(@Query('token') token: string, @Res() res: Response) {
    await this.auth.verifyEmail(token);
    const redirect = `${process.env.FRONTEND_URL}/verified`;
    return res.redirect(302, redirect);
  }

  // --- Forgot password ---
  @Post('forgot')
  async forgot(@Body() dto: ForgotDto) {
    await this.auth.sendResetEmail(dto.email);
    return { ok: true };
  }

  // --- Reset password ---
  @Post('reset')
  async reset(@Body() dto: ResetDto) {
    await this.auth.performReset(dto.token, dto.newPassword);
    return { ok: true };
  }

  // ===============================
  // =========== MFA VERIFY =========
  // ===============================

  @Post('mfa/verify')
  async mfaVerify(@Body() dto: MfaVerifyDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // consume challenge -> userId
    const userId = await this.mfa.consumeChallenge(dto.mfaToken);
    // verify code against stored secret
    await this.mfa.verifyCodeForUser(userId, dto.code);
    // create session and set cookie
    const { raw } = await this.sessions.createSession(userId, req.ip, req.headers['user-agent'] as string | undefined);
    res.cookie('sid', raw, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', 
      maxAge: Number(process.env.SESSION_TTL_DAYS || 30) * 24 * 60 * 60 * 1000,
    });
    return { ok: true };
  }


  @Post('mfa/recover')
async mfaRecover(@Body() dto: MfaRecoverDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
  // If you used the challenge-token approach:
  // 1) consume mfa challenge token -> get userId
  let userId: string;
  if (dto.mfaToken) {
    userId = await this.mfa.consumeChallenge(dto.mfaToken); // throws if invalid
  } else {
    // Optionally, if frontend sends email or identifier, you should avoid user enumeration.
    // For safety keep mfaToken required for web flow.
    throw new BadRequestException('mfaToken required');
  }

  // 2) verify recovery code
  const ok = await this.mfa.consumeRecoveryCodeForUser(userId, dto.code);
  if (!ok) throw new BadRequestException('Invalid recovery code');

  // 3) create session and set cookie
  const { raw } = await this.sessions.createSession(userId, req.ip, req.headers['user-agent'] as string | undefined);
  res.cookie('sid', raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Number(process.env.SESSION_TTL_DAYS || 30) * 24 * 60 * 60 * 1000,
  });

  return { ok: true };
}

@UseGuards(SessionGuard)
@Post('recovery/use')
async useRecoveryWhileLogged(@CurrentUser() user: any, @Body() body: { code: string }) {
  const ok = await this.mfa.consumeRecoveryCodeForUser(user.id, body.code);
  if (!ok) throw new BadRequestException('Invalid recovery code');
  // disable MFA immediately if desired:
  await this.mfa.disable(user.id);
  return { ok: true };
}

}
