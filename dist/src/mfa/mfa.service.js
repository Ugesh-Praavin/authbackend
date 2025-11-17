"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MfaService = void 0;
const common_1 = require("@nestjs/common");
const recovery_util_1 = require("../common/recovery.util");
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const crypto_util_1 = require("../common/crypto.util");
const token_util_1 = require("../common/token.util");
const CHALLENGE_TTL = Number(process.env.MFA_CHALLENGE_TTL_SEC || 300);
let MfaService = class MfaService {
    prisma;
    redis;
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async startEnroll(userId) {
        const secret = otplib_1.authenticator.generateSecret();
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        const appName = process.env.APP_NAME || 'AuthService';
        const otpauth = otplib_1.authenticator.keyuri(user.email, appName, secret);
        const qrDataUrl = await qrcode_1.default.toDataURL(otpauth);
        return { otpauth, qrDataUrl, secret };
    }
    async finishEnroll(userId, secret, code) {
        const ok = otplib_1.authenticator.check(code, secret);
        if (!ok)
            throw new common_1.BadRequestException('Invalid code');
        const secretEnc = (0, crypto_util_1.encryptUTF8)(secret);
        await this.prisma.totpMfa.upsert({
            where: { userId },
            update: { secretEnc, createdAt: new Date() },
            create: { userId, secretEnc },
        });
        await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
        return { ok: true };
    }
    async verifyCodeForUser(userId, code) {
        const row = await this.prisma.totpMfa.findUnique({ where: { userId } });
        if (!row)
            throw new common_1.BadRequestException('MFA not enrolled');
        const secret = (0, crypto_util_1.decryptUTF8)(row.secretEnc);
        const ok = otplib_1.authenticator.check(code, secret);
        if (!ok)
            throw new common_1.BadRequestException('Invalid code');
        return true;
    }
    async disable(userId) {
        await this.prisma.totpMfa.deleteMany({ where: { userId } }).catch(() => { });
        await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false } });
        return { ok: true };
    }
    async createChallenge(userId) {
        const token = (0, token_util_1.newOpaqueToken)('mfa');
        const key = this.challengeKey(token);
        await this.redis.c.set(key, userId, { EX: CHALLENGE_TTL });
        return token;
    }
    async consumeChallenge(token) {
        const key = this.challengeKey(token);
        const userId = await this.redis.c.get(key);
        if (!userId)
            throw new common_1.BadRequestException('Invalid or expired challenge');
        await this.redis.c.del(key);
        return userId;
    }
    challengeKey(token) {
        return `mfa:challenge:${token}`;
    }
    async generateRecoveryCodes(userId, count = 10) {
        await this.prisma.recoveryCode.deleteMany({ where: { userId } }).catch(() => { });
        const codes = (0, recovery_util_1.generateRecoveryCodes)(count);
        const hashed = await Promise.all(codes.map(c => (0, recovery_util_1.hashRecoveryCode)(c)));
        const rows = hashed.map((h) => ({ userId, codeHash: h }));
        await this.prisma.recoveryCode.createMany({ data: rows });
        return codes;
    }
    async consumeRecoveryCodeForUser(userId, code) {
        const candidates = await this.prisma.recoveryCode.findMany({
            where: { userId, usedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        for (const c of candidates) {
            try {
                const ok = await (0, recovery_util_1.verifyRecoveryCode)(code, c.codeHash);
                if (ok) {
                    await this.prisma.recoveryCode.update({ where: { id: c.id }, data: { usedAt: new Date() } });
                    return true;
                }
            }
            catch (err) {
            }
        }
        return false;
    }
    async countUnusedRecoveryCodes(userId) {
        return this.prisma.recoveryCode.count({ where: { userId, usedAt: null } });
    }
};
exports.MfaService = MfaService;
exports.MfaService = MfaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, redis_service_1.RedisService])
], MfaService);
//# sourceMappingURL=mfa.service.js.map