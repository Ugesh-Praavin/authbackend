import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { Request } from 'express';
import { VerifyCallback } from 'passport';

interface GithubValidatePayload {
  profile: Profile;
  accessToken: string;
  refreshToken: string;
  state: string | undefined;
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      clientID: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      callbackURL: `${process.env.OAUTH_REDIRECT_BASE}/github/callback`,
      scope: ['user:email'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const state = (req.query.state as string | undefined) ?? undefined;

    const payload: GithubValidatePayload = {
      profile,
      accessToken,
      refreshToken,
      state,
    };

    return done(null, payload);
  }
}
