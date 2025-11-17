import { Module } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UsersController } from '../users/users.controller';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [SessionsModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
