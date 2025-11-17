"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthModule = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const google_strategy_1 = require("./strategies/google.strategy");
const github_strategy_1 = require("./strategies/github.strategy");
const auth_controller_1 = require("./auth.controller");
const sessions_module_1 = require("../sessions/sessions.module");
const prisma_module_1 = require("../prisma/prisma.module");
const redis_module_1 = require("../redis/redis.module");
const mfa_module_1 = require("../mfa/mfa.module");
let OAuthModule = class OAuthModule {
};
exports.OAuthModule = OAuthModule;
exports.OAuthModule = OAuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule.register({ session: false }),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            sessions_module_1.SessionsModule,
            mfa_module_1.MfaModule,
        ],
        providers: [google_strategy_1.GoogleStrategy, github_strategy_1.GithubStrategy],
        controllers: [auth_controller_1.AuthController],
        exports: [],
    })
], OAuthModule);
//# sourceMappingURL=oauth.module.js.map