import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';

/**
 * Generate N human-friendly codes (e.g. groups of 4 chars separated by '-')
 */
export function generateRecoveryCodes(n = 10, partLen = 4, parts = 3) {
  const codes: string[] = [];
  for (let i = 0; i < n; i++) {
    const raw = randomBytes(Math.ceil((partLen * parts) / 2))
      .toString('hex')
      .slice(0, partLen * parts);

    const groups: string[] = []; // <-- FIXED

    for (let p = 0; p < parts; p++) {
      groups.push(raw.slice(p * partLen, (p + 1) * partLen));
    }

    codes.push(groups.join('-').toUpperCase());
  }
  return codes;
}

export async function hashRecoveryCode(code: string) {
  // Argon2 ensures stored code hashes are resistant to brute force if DB is leaked
  return argon2.hash(code, { type: argon2.argon2id });
}

export async function verifyRecoveryCode(code: string, hash: string) {
  return argon2.verify(hash, code);
}
