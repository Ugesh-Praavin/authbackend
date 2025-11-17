import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private sessions: SessionsService,
    private users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const raw = req.cookies?.sid;

    if (!raw) throw new UnauthorizedException();

    // Validate session + load user
    const sessionUser = await this.sessions.userFromRaw(raw);
    const fullUser = await this.users.findById(sessionUser.id);

    req.user = {
      ...fullUser,
      roles: fullUser.roles,
    };

    return true;
  }
}
