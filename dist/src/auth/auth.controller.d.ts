import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SessionsService } from '../sessions/sessions.service';
import type { Request, Response } from 'express';
import { ForgotDto } from './dto/forgot.dto';
import { ResetDto } from './dto/reset.dto';
import { MfaService } from '../mfa/mfa.service';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { MfaRecoverDto } from './dto/mfa-recovery.dto';
export declare class AuthController {
    private auth;
    private sessions;
    private mfa;
    constructor(auth: AuthService, sessions: SessionsService, mfa: MfaService);
    register(dto: RegisterDto): Promise<{
        id: string;
        email: string;
        emailVerified: boolean;
    }>;
    rotate(req: Request, res: Response): Promise<{
        ok: boolean;
    }>;
    logoutAll(req: Request, res: Response): Promise<{
        ok: boolean;
    }>;
    login(dto: LoginDto, req: Request, res: Response): Promise<{
        mfa_required: boolean;
        mfa_token: string;
        user?: undefined;
    } | {
        user: {
            id: string;
            email: string;
            emailVerified: boolean;
        };
        mfa_required?: undefined;
        mfa_token?: undefined;
    }>;
    me(req: Request): Promise<{
        user: {
            id: string;
            email: string;
            emailVerified: boolean;
            mfaEnabled: boolean;
        };
    }>;
    logout(req: Request, res: Response): Promise<{
        ok: boolean;
    }>;
    verify(token: string, res: Response): Promise<void>;
    forgot(dto: ForgotDto): Promise<{
        ok: boolean;
    }>;
    reset(dto: ResetDto): Promise<{
        ok: boolean;
    }>;
    mfaVerify(dto: MfaVerifyDto, req: Request, res: Response): Promise<{
        ok: boolean;
    }>;
    mfaRecover(dto: MfaRecoverDto, req: Request, res: Response): Promise<{
        ok: boolean;
    }>;
    useRecoveryWhileLogged(user: any, body: {
        code: string;
    }): Promise<{
        ok: boolean;
    }>;
}
