import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from 'src/users/users.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';

@Module({
  imports: [SessionsModule, UsersModule],
  providers: [AuthService, GoogleStrategy, GithubStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
