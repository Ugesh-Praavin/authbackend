import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findById(id: string): Promise<{
        roles: string[];
        id: string;
        email: string;
        emailVerified: boolean;
        mfaEnabled: boolean;
    }>;
    addRole(userId: string, roleName: string): Promise<{
        roles: string[];
        id: string;
        email: string;
        emailVerified: boolean;
        mfaEnabled: boolean;
    }>;
    removeRole(userId: string, roleName: string): Promise<{
        roles: string[];
        id: string;
        email: string;
        emailVerified: boolean;
        mfaEnabled: boolean;
    }>;
}
