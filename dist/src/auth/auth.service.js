"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const argon2 = __importStar(require("argon2"));
const mailer_service_1 = require("../mailer/mailer.service");
const magic_util_1 = require("../common/magic.util");
const date_fns_1 = require("date-fns");
let AuthService = class AuthService {
    prisma;
    mailer;
    constructor(prisma, mailer) {
        this.prisma = prisma;
        this.mailer = mailer;
    }
    async register(dto) {
        const email = dto.email.toLowerCase().trim();
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing)
            throw new common_1.BadRequestException('Email already in use');
        const passwordHash = await argon2.hash(dto.password, {
            type: argon2.argon2id,
        });
        const user = await this.prisma.user.create({
            data: { email, passwordHash },
        });
        await this.sendVerifyEmail(user.id, user.email);
        return {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
        };
    }
    async validateUser(dto) {
        const email = dto.email.toLowerCase().trim();
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const ok = await argon2.verify(user.passwordHash, dto.password);
        if (!ok)
            throw new common_1.UnauthorizedException('Invalid credentials');
        return user;
    }
    async sendVerifyEmail(userId, email) {
        const token = (0, magic_util_1.newMagicToken)('verify');
        const tokenHash = await (0, magic_util_1.hashMagic)(token);
        const expiresAt = (0, date_fns_1.addMinutes)(new Date(), 30);
        await this.prisma.magicLink.create({
            data: {
                userId,
                type: 'VERIFY_EMAIL',
                tokenHash,
                expiresAt,
            },
        });
        const url = `${process.env.APP_URL}/auth/verify?token=${token}`;
        const html = `
      <p>Verify your email for Auth Service.</p>
      <p><a href="${url}">Click to verify</a> (valid 30 minutes)</p>
    `;
        await this.mailer.send(email, 'Verify your email', html);
    }
    async verifyEmail(token) {
        const links = await this.prisma.magicLink.findMany({
            where: {
                type: 'VERIFY_EMAIL',
                usedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        for (const link of links) {
            const ok = await argon2.verify(link.tokenHash, token);
            if (ok) {
                await this.prisma.$transaction([
                    this.prisma.user.update({
                        where: { id: link.userId },
                        data: { emailVerified: true },
                    }),
                    this.prisma.magicLink.update({
                        where: { id: link.id },
                        data: { usedAt: new Date() },
                    }),
                ]);
                return { ok: true };
            }
        }
        throw new common_1.BadRequestException('Invalid or expired token');
    }
    async sendResetEmail(email) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        if (!user)
            return;
        const token = (0, magic_util_1.newMagicToken)('reset');
        const tokenHash = await (0, magic_util_1.hashMagic)(token);
        const expiresAt = (0, date_fns_1.addMinutes)(new Date(), 30);
        await this.prisma.magicLink.create({
            data: { userId: user.id, type: 'RESET_PASSWORD', tokenHash, expiresAt },
        });
        const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        const html = `
      <p>Reset your password.</p>
      <p><a href="${url}">Reset link</a> (valid 30 minutes)</p>
    `;
        await this.mailer.send(user.email, 'Reset your password', html);
    }
    async performReset(token, newPassword) {
        const links = await this.prisma.magicLink.findMany({
            where: {
                type: 'RESET_PASSWORD',
                usedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        for (const link of links) {
            const ok = await argon2.verify(link.tokenHash, token);
            if (ok) {
                const passwordHash = await argon2.hash(newPassword, {
                    type: argon2.argon2id,
                });
                await this.prisma.$transaction([
                    this.prisma.user.update({
                        where: { id: link.userId },
                        data: { passwordHash },
                    }),
                    this.prisma.magicLink.update({
                        where: { id: link.id },
                        data: { usedAt: new Date() },
                    }),
                    this.prisma.session.deleteMany({ where: { userId: link.userId } }),
                ]);
                return { ok: true };
            }
        }
        throw new common_1.BadRequestException('Invalid or expired token');
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mailer_service_1.MailerService])
], AuthService);
//# sourceMappingURL=auth.service.js.map