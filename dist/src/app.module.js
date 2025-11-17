"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const redis_module_1 = require("./redis/redis.module");
const mailer_module_1 = require("./mailer/mailer.module");
const users_module_1 = require("./users/users.module");
const mfa_module_1 = require("./mfa/mfa.module");
const sessions_module_1 = require("./sessions/sessions.module");
const health_module_1 = require("./health/health.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60_000,
                    limit: 50,
                },
            ]),
            prisma_module_1.PrismaModule,
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            auth_module_1.AuthModule,
            redis_module_1.RedisModule,
            mailer_module_1.MailerModule,
            mfa_module_1.MfaModule,
            sessions_module_1.SessionsModule,
            health_module_1.HealthModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map