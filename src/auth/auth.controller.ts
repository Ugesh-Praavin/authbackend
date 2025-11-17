import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  Param,
} from '@nestjs/common';
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

import { AuthGuard } from '@nestjs/passport'; // <-- FIX #2
import { newOpaqueToken } from '../common/token.util'; // <-- FIX #3

import { PrismaService } from '../prisma/prisma.service'; // <-- FIX #4
import { RedisService } from '../redis/redis.service';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private sessions: SessionsService,
    private mfa: MfaService,
    private prisma: PrismaService, // <-- FIX
    private redis: RedisService,
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
      req.headers['user-agent'],
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
  async logoutAll(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = req.cookies?.sid;
    const me = await this.sessions.userFromRaw(raw);
    await this.sessions.deleteAllForUser(me.id);
    res.clearCookie('sid', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
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
  async mfaVerify(
    @Body() dto: MfaVerifyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // consume challenge -> userId
    const userId = await this.mfa.consumeChallenge(dto.mfaToken);
    // verify code against stored secret
    await this.mfa.verifyCodeForUser(userId, dto.code);
    // create session and set cookie
    const { raw } = await this.sessions.createSession(
      userId,
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
    return { ok: true };
  }

  @Post('mfa/recover')
  async mfaRecover(
    @Body() dto: MfaRecoverDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
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
    const { raw } = await this.sessions.createSession(
      userId,
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

    return { ok: true };
  }

  @UseGuards(SessionGuard)
  @Post('recovery/use')
  async useRecoveryWhileLogged(
    @CurrentUser() user: any,
    @Body() body: { code: string },
  ) {
    const ok = await this.mfa.consumeRecoveryCodeForUser(user.id, body.code);
    if (!ok) throw new BadRequestException('Invalid recovery code');
    // disable MFA immediately if desired:
    await this.mfa.disable(user.id);
    return { ok: true };
  }

  @Get('oauth/:provider/start')
  async oauthStart(@Param('provider') provider: string, @Res() res: Response) {
    // create a short random state token and persist in Redis -> value = provider (optionally)
    const state = newOpaqueToken('ost'); // reuse common token util
    await this.redis.c.set(`oauth:state:${state}`, provider, { EX: 300 }); // 5 min

    let url = '';
    if (provider === 'google') {
      // passport will build the URL for us if we delegate to passport but for explicit redirect:
      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        redirect_uri: `${process.env.OAUTH_REDIRECT_BASE}/google/callback`,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        state,
      });
      url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    } else if (provider === 'github') {
      const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID!,
        redirect_uri: `${process.env.OAUTH_REDIRECT_BASE}/github/callback`,
        scope: 'user:email',
        state,
      });
      url = `https://github.com/login/oauth/authorize?${params.toString()}`;
    } else {
      return res.status(400).send('Unknown provider');
    }

    // store state in redis keyed to state => optional: store a nonce + original redirect
    return res.redirect(302, url);
  }

  @UseGuards(AuthGuard('google'))
  @Get('oauth/google/callback')
  async googleCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Passport's validate returned object we created in strategy: { profile, accessToken, refreshToken, state }
    const payload = (req as any).user;

    return this.handleOAuthCallback(payload, res, req);
  }

  @UseGuards(AuthGuard('github'))
  @Get('oauth/github/callback')
  async githubCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const payload = (req as any).user;

    return this.handleOAuthCallback(payload, res, req);
  }

  private async handleOAuthCallback(payload: any, res: Response, req: Request) {
    const { profile, accessToken, refreshToken, state } = payload;
    // validate state
    const stored = await this.redis.c.get(`oauth:state:${state}`);
    if (!stored) return res.status(400).send('Invalid state');

    // providerName determined by endpoint or payload
    const provider =
      profile.provider ||
      profile._json?.provider ||
      (req.path.includes('google') ? 'google' : 'github');
    const providerId = profile.id;
    const email = (() => {
      if (profile.emails && profile.emails.length)
        return profile.emails[0].value;
      if (profile._json?.email) return profile._json.email;
      return null;
    })();

    // find identity
    const identity = await this.prisma.identity
      .findUnique({ where: { provider_providerId: { provider, providerId } } })
      .catch(() => null);

    let user;
    if (identity) {
      user = await this.prisma.user.findUnique({
        where: { id: identity.userId },
      });
    } else {
      if (email) {
        user = await this.prisma.user.findUnique({ where: { email } });
      }
      if (!user) {
        // create user
        user = await this.prisma.user.create({
          data: {
            email: email ?? `noemail+${provider}-${providerId}@local`, // fallback synthetic
            emailVerified: email ? true : false,
          },
        });
      }
      // create identity row
      await this.prisma.identity.create({
        data: { provider, providerId, providerRaw: profile, userId: user.id },
      });
    }

    // create session for user
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

    // redirect to frontend (optionally append ?sso=1)
    return res.redirect(302, `${process.env.FRONTEND_URL}?oauth=success`);
  }
}
