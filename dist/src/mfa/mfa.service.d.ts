import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
export declare class MfaService {
    private prisma;
    private redis;
    constructor(prisma: PrismaService, redis: RedisService);
    startEnroll(userId: string): Promise<{
        otpauth: string;
        qrDataUrl: any;
        secret: string;
    }>;
    finishEnroll(userId: string, secret: string, code: string): Promise<{
        ok: boolean;
    }>;
    verifyCodeForUser(userId: string, code: string): Promise<boolean>;
    disable(userId: string): Promise<{
        ok: boolean;
    }>;
    createChallenge(userId: string): Promise<string>;
    consumeChallenge(token: string): Promise<string>;
    private challengeKey;
    generateRecoveryCodes(userId: string, count?: number): Promise<string[]>;
    consumeRecoveryCodeForUser(userId: string, code: string): Promise<boolean>;
    countUnusedRecoveryCodes(userId: string): Promise<number>;
}
