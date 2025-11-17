import { CanActivate, ExecutionContext } from '@nestjs/common';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';
export declare class SessionGuard implements CanActivate {
    private readonly sessions;
    private readonly users;
    constructor(sessions: SessionsService, users: UsersService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
