import { MfaService } from './mfa.service';
export declare class MfaController {
    private mfa;
    constructor(mfa: MfaService);
    start(user: any): Promise<{
        otpauth: string;
        qrDataUrl: any;
        secret: string;
    }>;
    finish(user: any, body: {
        secret: string;
        code: string;
    }): Promise<{
        ok: boolean;
    }>;
    disable(user: any): Promise<{
        ok: boolean;
    }>;
    generateRecovery(user: any, body: {
        count?: number;
    }): Promise<{
        codes: string[];
    }>;
}
