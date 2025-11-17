import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';

export function newMagicToken(prefix = 'ml') {
  const raw = randomBytes(32).toString('base64url');
  return `${prefix}_${raw}`;
}

export async function hashMagic(raw: string) {
  return argon2.hash(raw, { type: argon2.argon2id });
}
