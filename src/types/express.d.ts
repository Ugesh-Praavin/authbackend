import "express";

declare global {
  namespace Express {
    interface User {
      id: string;
      email?: string;
      emailVerified?: boolean;
      mfaEnabled?: boolean;
      roles?: unknown[];
    }

    interface Request {
      user?: User;
      cookies?: Record<string, string | undefined>;
    }
  }
}

export {};
