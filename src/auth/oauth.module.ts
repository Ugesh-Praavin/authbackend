import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionsModule } from '../sessions/sessions.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { MfaModule } from '../mfa/mfa.module';

@Module({
  imports: [
    PassportModule.register({ session: false }),
    PrismaModule,
    RedisModule,
    SessionsModule,
    MfaModule,
  ],
  providers: [GoogleStrategy, GithubStrategy],
  controllers: [AuthController], // we'll add callback routes in the existing AuthController
  exports: [],
})
export class OAuthModule {}
