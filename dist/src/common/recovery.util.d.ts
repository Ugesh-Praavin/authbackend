export declare function generateRecoveryCodes(n?: number, partLen?: number, parts?: number): string[];
export declare function hashRecoveryCode(code: string): Promise<string>;
export declare function verifyRecoveryCode(code: string, hash: string): Promise<boolean>;
