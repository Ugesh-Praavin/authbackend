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
exports.SessionGuard = void 0;
const common_1 = require("@nestjs/common");
const sessions_service_1 = require("../sessions/sessions.service");
const users_service_1 = require("../users/users.service");
let SessionGuard = class SessionGuard {
    sessions;
    users;
    constructor(sessions, users) {
        this.sessions = sessions;
        this.users = users;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const raw = req.cookies?.sid;
        if (!raw)
            throw new common_1.UnauthorizedException();
        const sessionUser = await this.sessions.userFromRaw(raw);
        const fullUser = await this.users.findById(sessionUser.id);
        req.user = {
            ...fullUser,
            roles: fullUser.roles,
        };
        return true;
    }
};
exports.SessionGuard = SessionGuard;
exports.SessionGuard = SessionGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sessions_service_1.SessionsService,
        users_service_1.UsersService])
], SessionGuard);
//# sourceMappingURL=session.guard.js.map