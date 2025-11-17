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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const token_util_1 = require("../common/token.util");
const date_fns_1 = require("date-fns");
let SessionsService = class SessionsService {
    prisma;
    redis;
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async createSession(userId, ip, ua) {
        const raw = (0, token_util_1.newOpaqueToken)('sess');
        const hash = await (0, token_util_1.hashToken)(raw);
        const days = Number(process.env.SESSION_TTL_DAYS || 30);
        const expiresAt = (0, date_fns_1.addDays)(new Date(), days);
        const session = await this.prisma.session.create({
            data: {
                userId,
                sessionHash: hash,
                ip: ip ?? undefined,
                userAgent: ua ?? undefined,
                expiresAt,
            },
            select: { id: true, userId: true, expiresAt: true, sessionHash: true },
        });
        await this.redis.c.set(this.redisKey(raw), session.id, { EX: days * 24 * 60 * 60 });
        return { raw, session };
    }
    async rotate(raw, ip, ua) {
        if (!raw)
            throw new common_1.UnauthorizedException();
        const user = await this.userFromRaw(raw);
        await this.deleteByRaw(raw);
        return this.createSession(user.id, ip, ua);
    }
    async deleteAllForUser(userId) {
        await this.prisma.session.deleteMany({ where: { userId } });
    }
    async validate(raw) {
        if (!raw)
            throw new common_1.UnauthorizedException();
        const cachedId = await this.redis.c.get(this.redisKey(raw));
        let session = null;
        if (cachedId) {
            session = await this.prisma.session.findUnique({
                where: { id: cachedId },
                select: { id: true, userId: true, sessionHash: true, expiresAt: true },
            });
        }
        else {
            session = await this.lookupByRawHash(raw);
        }
        if (!session)
            throw new common_1.UnauthorizedException();
        if (session.expiresAt < new Date()) {
            await this.prisma.session.delete({ where: { id: session.id } }).catch(() => { });
            throw new common_1.UnauthorizedException();
        }
        const ok = await (0, token_util_1.verifyToken)(raw, session.sessionHash);
        if (!ok)
            throw new common_1.UnauthorizedException();
        return session;
    }
    async deleteByRaw(raw) {
        const cachedId = await this.redis.c.get(this.redisKey(raw));
        if (cachedId) {
            await this.prisma.session.delete({ where: { id: cachedId } }).catch(() => { });
            await this.redis.c.del(this.redisKey(raw));
            return;
        }
        const found = await this.lookupByRawHash(raw);
        if (found) {
            await this.prisma.session.delete({ where: { id: found.id } }).catch(() => { });
        }
    }
    async userFromRaw(raw) {
        const session = await this.validate(raw);
        const user = await this.prisma.user.findUnique({
            where: { id: session.userId },
            select: { id: true, email: true, emailVerified: true, mfaEnabled: true },
        });
        if (!user)
            throw new common_1.UnauthorizedException();
        return user;
    }
    redisKey(raw) {
        return `sess:${raw}`;
    }
    async lookupByRawHash(raw) {
        return null;
    }
};
exports.SessionsService = SessionsService;
exports.SessionsService = SessionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], SessionsService);
//# sourceMappingURL=sessions.service.js.map