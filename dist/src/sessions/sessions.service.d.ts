import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
export declare class SessionsService {
    private prisma;
    private redis;
    constructor(prisma: PrismaService, redis: RedisService);
    createSession(userId: string, ip?: string | null, ua?: string | null): Promise<{
        raw: string;
        session: {
            id: string;
            expiresAt: Date;
            userId: string;
            sessionHash: string;
        };
    }>;
    rotate(raw: string | undefined, ip?: string | null, ua?: string | null): Promise<{
        raw: string;
        session: {
            id: string;
            expiresAt: Date;
            userId: string;
            sessionHash: string;
        };
    }>;
    deleteAllForUser(userId: string): Promise<void>;
    validate(raw: string): Promise<{
        id: string;
        userId: string;
        sessionHash: string;
        expiresAt: Date;
    }>;
    deleteByRaw(raw: string): Promise<void>;
    userFromRaw(raw: string): Promise<{
        id: string;
        email: string;
        emailVerified: boolean;
        mfaEnabled: boolean;
    }>;
    private redisKey;
    private lookupByRawHash;
}
