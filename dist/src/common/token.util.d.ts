export declare function newOpaqueToken(prefix?: string): string;
export declare function hashToken(raw: string): Promise<string>;
export declare function verifyToken(raw: string, hash: string): Promise<boolean>;
