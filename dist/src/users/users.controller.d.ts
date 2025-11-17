import { UsersService } from './users.service';
export declare class UsersController {
    private users;
    constructor(users: UsersService);
    get(id: string): Promise<{
        roles: string[];
        id: string;
        email: string;
        emailVerified: boolean;
    }>;
    addRole(id: string, body: {
        role: string;
    }): Promise<{
        roles: string[];
        id: string;
        email: string;
        emailVerified: boolean;
    }>;
    removeRole(id: string, body: {
        role: string;
    }): Promise<{
        roles: string[];
        id: string;
        email: string;
        emailVerified: boolean;
    }>;
}
