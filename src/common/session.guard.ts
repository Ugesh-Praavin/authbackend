import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';
import { Request } from 'express';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionsService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const sid = req.cookies?.sid;
    if (!sid) throw new UnauthorizedException();

    // 1 — validate session
    const sessionUser = await this.sessions.userFromRaw(sid);

    // 2 — load full user
    const fullUser = await this.users.findById(sessionUser.id);
    if (!fullUser) throw new UnauthorizedException();

    // 3 — attach typed user to Express request
    req.user = {
      id: fullUser.id,
      email: fullUser.email,
      emailVerified: fullUser.emailVerified,
      mfaEnabled: fullUser.mfaEnabled,
      roles: fullUser.roles,
    };

    return true;
  }
}
