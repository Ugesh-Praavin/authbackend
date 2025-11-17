import { Global, Module } from '@nestjs/common';
import { MfaService } from './mfa.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SessionsModule } from 'src/sessions/sessions.module';
import { UsersModule } from 'src/users/users.module';
import { MfaController } from './mfa.controller';

@Global()
@Module({
  imports: [PrismaModule, RedisModule, SessionsModule, UsersModule],
  providers: [MfaService],
  controllers: [MfaController],
  exports: [MfaService],
})
export class MfaModule {}
