import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailerService } from '../mailer/mailer.service';
export declare class AuthService {
    private prisma;
    private mailer;
    constructor(prisma: PrismaService, mailer: MailerService);
    register(dto: RegisterDto): Promise<{
        id: string;
        email: string;
        emailVerified: boolean;
    }>;
    validateUser(dto: LoginDto): Promise<{
        id: string;
        email: string;
        emailVerified: boolean;
        passwordHash: string | null;
        mfaEnabled: boolean;
        profile: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        updatedAt: Date;
    }>;
    sendVerifyEmail(userId: string, email: string): Promise<void>;
    verifyEmail(token: string): Promise<{
        ok: boolean;
    }>;
    sendResetEmail(email: string): Promise<void>;
    performReset(token: string, newPassword: string): Promise<{
        ok: boolean;
    }>;
}
