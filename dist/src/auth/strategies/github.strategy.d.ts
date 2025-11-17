import { Profile } from 'passport-github2';
import { Request } from 'express';
import { VerifyCallback } from 'passport';
declare const GithubStrategy_base: new (...args: any) => any;
export declare class GithubStrategy extends GithubStrategy_base {
    constructor();
    validate(req: Request, accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback): Promise<void>;
}
export {};
