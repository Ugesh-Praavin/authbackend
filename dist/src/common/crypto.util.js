"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptUTF8 = encryptUTF8;
exports.decryptUTF8 = decryptUTF8;
const crypto_1 = __importDefault(require("crypto"));
const keyBase64 = process.env.ENCRYPTION_KEY;
if (!keyBase64)
    throw new Error('ENCRYPTION_KEY not set in env');
const KEY = Buffer.from(keyBase64.replace(/^base64:/, ''), 'base64');
function encryptUTF8(plaintext) {
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv('aes-256-gcm', KEY, iv);
    const ciphertext = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}
function decryptUTF8(dataB64) {
    const buf = Buffer.from(dataB64, 'base64');
    const iv = buf.slice(0, 12);
    const tag = buf.slice(12, 28);
    const ciphertext = buf.slice(28);
    const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return out.toString('utf8');
}
//# sourceMappingURL=crypto.util.js.map