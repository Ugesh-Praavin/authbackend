import crypto from 'crypto';

const keyBase64 = process.env.ENCRYPTION_KEY;
if (!keyBase64) throw new Error('ENCRYPTION_KEY not set in env');
const KEY = Buffer.from(keyBase64.replace(/^base64:/, ''), 'base64'); // 32 bytes

export function encryptUTF8(plaintext: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64'); // store as base64
}

export function decryptUTF8(dataB64: string) {
  const buf = Buffer.from(dataB64, 'base64');
  const iv = buf.slice(0, 12);
  const tag = buf.slice(12, 28);
  const ciphertext = buf.slice(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return out.toString('utf8');
}
