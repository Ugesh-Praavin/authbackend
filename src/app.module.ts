import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { MailerModule } from './mailer/mailer.module';
import { UsersModule } from './users/users.module';
import { MfaModule } from './mfa/mfa.module';
import { SessionsModule } from './sessions/sessions.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 60s window
        limit: 50, // 50 requests/min per IP
      },
    ]),
    PrismaModule,
    UsersModule,
    AuthModule,
    AuthModule,
    RedisModule,
    MailerModule,
    MfaModule,
    SessionsModule,
    // We'll add PrismaModule, AuthModule, UsersModule, SessionsModule, MailerModule soon
  ],
})
export class AppModule {}
