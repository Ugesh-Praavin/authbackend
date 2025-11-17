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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const sessions_service_1 = require("../sessions/sessions.service");
const forgot_dto_1 = require("./dto/forgot.dto");
const reset_dto_1 = require("./dto/reset.dto");
const mfa_service_1 = require("../mfa/mfa.service");
const mfa_verify_dto_1 = require("./dto/mfa-verify.dto");
const session_guard_1 = require("../common/session.guard");
const current_user_decorator_1 = require("../common/current-user.decorator");
const mfa_recovery_dto_1 = require("./dto/mfa-recovery.dto");
const passport_1 = require("@nestjs/passport");
const token_util_1 = require("../common/token.util");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
let AuthController = class AuthController {
    auth;
    sessions;
    mfa;
    prisma;
    redis;
    constructor(auth, sessions, mfa, prisma, redis) {
        this.auth = auth;
        this.sessions = sessions;
        this.mfa = mfa;
        this.prisma = prisma;
        this.redis = redis;
    }
    register(dto) {
        return this.auth.register(dto);
    }
    async rotate(req, res) {
        const raw = req.cookies?.sid;
        const { raw: nextRaw } = await this.sessions.rotate(raw, req.ip, req.headers['user-agent']);
        res.cookie('sid', nextRaw, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: Number(process.env.SESSION_TTL_DAYS || 30) * 24 * 60 * 60 * 1000,
        });
        return { ok: true };
    }
    async logoutAll(req, res) {
        const raw = req.cookies?.sid;
        const me = await this.sessions.userFromRaw(raw);
        await this.sessions.deleteAllForUser(me.id);
        res.clearCookie('sid', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });
        return { ok: true };
    }
    async login(dto, req, res) {
        const user = await this.auth.validateUser(dto);
        if (user.mfaEnabled) {
            const mfaToken = await this.mfa.createChallenge(user.id);
            return { mfa_required: true, mfa_token: mfaToken };
        }
        const { raw } = await this.sessions.createSession(user.id, req.ip, req.headers['user-agent']);
        res.cookie('sid', raw, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: Number(process.env.SESSION_TTL_DAYS || 30) * 24 * 60 * 60 * 1000,
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                emailVerified: user.emailVerified,
            },
        };
    }
    async me(req) {
        const raw = req.cookies?.sid;
        const user = await this.sessions.userFromRaw(raw);
        return { user };
    }
    async logout(req, res) {
        const raw = req.cookies?.sid;
        if (raw) {
            await this.sessions.deleteByRaw(raw);
            res.clearCookie('sid', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
            });
        }
        return { ok: true };
    }
    async verify(token, res) {
        await this.auth.verifyEmail(token);
        const redirect = `${process.env.FRONTEND_URL}/verified`;
        return res.redirect(302, redirect);
    }
    async forgot(dto) {
        await this.auth.sendResetEmail(dto.email);
        return { ok: true };
    }
    async reset(dto) {
        await this.auth.performReset(dto.token, dto.newPassword);
        return { ok: true };
    }
    async mfaVerify(dto, req, res) {
        const userId = await this.mfa.consumeChallenge(dto.mfaToken);
        await this.mfa.verifyCodeForUser(userId, dto.code);
        const { raw } = await this.sessions.createSession(userId, req.ip, req.headers['user-agent']);
        res.cookie('sid', raw, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: Number(process.env.SESSION_TTL_DAYS || 30) * 24 * 60 * 60 * 1000,
        });
        return { ok: true };
    }
    async mfaRecover(dto, req, res) {
        let userId;
        if (dto.mfaToken) {
            userId = await this.mfa.consumeChallenge(dto.mfaToken);
        }
        else {
            throw new common_1.BadRequestException('mfaToken required');
        }
        const ok = await this.mfa.consumeRecoveryCodeForUser(userId, dto.code);
        if (!ok)
            throw new common_1.BadRequestException('Invalid recovery code');
        const { raw } = await this.sessions.createSession(userId, req.ip, req.headers['user-agent']);
        res.cookie('sid', raw, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: Number(process.env.SESSION_TTL_DAYS || 30) * 24 * 60 * 60 * 1000,
        });
        return { ok: true };
    }
    async useRecoveryWhileLogged(user, body) {
        const ok = await this.mfa.consumeRecoveryCodeForUser(user.id, body.code);
        if (!ok)
            throw new common_1.BadRequestException('Invalid recovery code');
        await this.mfa.disable(user.id);
        return { ok: true };
    }
    async oauthStart(provider, res) {
        const state = (0, token_util_1.newOpaqueToken)('ost');
        await this.redis.c.set(`oauth:state:${state}`, provider, { EX: 300 });
        let url = '';
        if (provider === 'google') {
            const params = new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID,
                redirect_uri: `${process.env.OAUTH_REDIRECT_BASE}/google/callback`,
                response_type: 'code',
                scope: 'openid email profile',
                access_type: 'offline',
                state,
            });
            url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        }
        else if (provider === 'github') {
            const params = new URLSearchParams({
                client_id: process.env.GITHUB_CLIENT_ID,
                redirect_uri: `${process.env.OAUTH_REDIRECT_BASE}/github/callback`,
                scope: 'user:email',
                state,
            });
            url = `https://github.com/login/oauth/authorize?${params.toString()}`;
        }
        else {
            return res.status(400).send('Unknown provider');
        }
        return res.redirect(302, url);
    }
    async googleCallback(req, res) {
        const payload = req.user;
        return this.handleOAuthCallback(payload, res, req);
    }
    async githubCallback(req, res) {
        const payload = req.user;
        return this.handleOAuthCallback(payload, res, req);
    }
    async handleOAuthCallback(payload, res, req) {
        const { profile, accessToken, refreshToken, state } = payload;
        const stored = await this.redis.c.get(`oauth:state:${state}`);
        if (!stored)
            return res.status(400).send('Invalid state');
        const provider = profile.provider ||
            profile._json?.provider ||
            (req.path.includes('google') ? 'google' : 'github');
        const providerId = profile.id;
        const email = (() => {
            if (profile.emails && profile.emails.length)
                return profile.emails[0].value;
            if (profile._json?.email)
                return profile._json.email;
            return null;
        })();
        const identity = await this.prisma.identity
            .findUnique({ where: { provider_providerId: { provider, providerId } } })
            .catch(() => null);
        let user;
        if (identity) {
            user = await this.prisma.user.findUnique({
                where: { id: identity.userId },
            });
        }
        else {
            if (email) {
                user = await this.prisma.user.findUnique({ where: { email } });
            }
            if (!user) {
                user = await this.prisma.user.create({
                    data: {
                        email: email ?? `noemail+${provider}-${providerId}@local`,
                        emailVerified: email ? true : false,
                    },
                });
            }
            await this.prisma.identity.create({
                data: { provider, providerId, providerRaw: profile, userId: user.id },
            });
        }
        const { raw } = await this.sessions.createSession(user.id, req.ip, req.headers['user-agent']);
        res.cookie('sid', raw, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: Number(process.env.SESSION_TTL_DAYS || 30) * 24 * 60 * 60 * 1000,
        });
        return res.redirect(302, `${process.env.FRONTEND_URL}?oauth=success`);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('rotate'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "rotate", null);
__decorate([
    (0, common_1.Post)('logout-all'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logoutAll", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('verify'),
    __param(0, (0, common_1.Query)('token')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verify", null);
__decorate([
    (0, common_1.Post)('forgot'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_dto_1.ForgotDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgot", null);
__decorate([
    (0, common_1.Post)('reset'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_dto_1.ResetDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "reset", null);
__decorate([
    (0, common_1.Post)('mfa/verify'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [mfa_verify_dto_1.MfaVerifyDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "mfaVerify", null);
__decorate([
    (0, common_1.Post)('mfa/recover'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [mfa_recovery_dto_1.MfaRecoverDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "mfaRecover", null);
__decorate([
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    (0, common_1.Post)('recovery/use'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "useRecoveryWhileLogged", null);
__decorate([
    (0, common_1.Get)('oauth/:provider/start'),
    __param(0, (0, common_1.Param)('provider')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "oauthStart", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('google')),
    (0, common_1.Get)('oauth/google/callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleCallback", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('github')),
    (0, common_1.Get)('oauth/github/callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "githubCallback", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        sessions_service_1.SessionsService,
        mfa_service_1.MfaService,
        prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map