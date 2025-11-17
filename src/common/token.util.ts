import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';

export function newOpaqueToken(prefix = 'sess'): string {
  const raw = randomBytes(32).toString('base64url');
  return `${prefix}_${raw}`;
}

export async function hashToken(raw: string): Promise<string> {
  return argon2.hash(raw, { type: argon2.argon2id });
}

export async function verifyToken(raw: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, raw);
}
