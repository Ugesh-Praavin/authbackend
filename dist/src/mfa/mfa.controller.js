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
exports.MfaController = void 0;
const common_1 = require("@nestjs/common");
const mfa_service_1 = require("./mfa.service");
const session_guard_1 = require("../common/session.guard");
const current_user_decorator_1 = require("../common/current-user.decorator");
let MfaController = class MfaController {
    mfa;
    constructor(mfa) {
        this.mfa = mfa;
    }
    async start(user) {
        return this.mfa.startEnroll(user.id);
    }
    async finish(user, body) {
        return this.mfa.finishEnroll(user.id, body.secret, body.code);
    }
    async disable(user) {
        return this.mfa.disable(user.id);
    }
    async generateRecovery(user, body) {
        const count = body?.count ?? 10;
        const codes = await this.mfa.generateRecoveryCodes(user.id, count);
        return { codes };
    }
};
exports.MfaController = MfaController;
__decorate([
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    (0, common_1.Get)('enroll/start'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MfaController.prototype, "start", null);
__decorate([
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    (0, common_1.Post)('enroll/finish'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MfaController.prototype, "finish", null);
__decorate([
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    (0, common_1.Delete)('disable'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MfaController.prototype, "disable", null);
__decorate([
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    (0, common_1.Post)('recovery/generate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MfaController.prototype, "generateRecovery", null);
exports.MfaController = MfaController = __decorate([
    (0, common_1.Controller)('mfa'),
    __metadata("design:paramtypes", [mfa_service_1.MfaService])
], MfaController);
//# sourceMappingURL=mfa.controller.js.map