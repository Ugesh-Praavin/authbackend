import { Injectable, BadRequestException } from '@nestjs/common';
import {
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCode,
} from '../common/recovery.util';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { encryptUTF8, decryptUTF8 } from '../common/crypto.util';
import { newOpaqueToken } from '../common/token.util';

const CHALLENGE_TTL = Number(process.env.MFA_CHALLENGE_TTL_SEC || 300);

@Injectable()
export class MfaService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // 1) Generate a TOTP secret and otpauth URL + QR (data URL)
  async startEnroll(userId: string) {
    const secret = authenticator.generateSecret(); // base32
    // Build otpauth URL (label uses app and user's email)
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    const appName = process.env.APP_NAME || 'AuthService';
    const otpauth = authenticator.keyuri(user.email, appName, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    // Return QR data URL + secret (secret is needed to display to user in case they can't scan)
    // We will not store; user must prove by verifying a TOTP code.
    return { otpauth, qrDataUrl, secret };
  }

  // 2) Complete enrollment: verify provided code against secret, then store encrypted secret
  async finishEnroll(userId: string, secret: string, code: string) {
    const ok = authenticator.check(code, secret);
    if (!ok) throw new BadRequestException('Invalid code');
    const secretEnc = encryptUTF8(secret);
    // upsert TotpMfa row
    await this.prisma.totpMfa.upsert({
      where: { userId },
      update: { secretEnc, createdAt: new Date() },
      create: { userId, secretEnc },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });
    return { ok: true };
  }

  // verify one-time code against stored secret
  async verifyCodeForUser(userId: string, code: string) {
    const row = await this.prisma.totpMfa.findUnique({ where: { userId } });
    if (!row) throw new BadRequestException('MFA not enrolled');
    const secret = decryptUTF8(row.secretEnc);
    const ok = authenticator.check(code, secret);
    if (!ok) throw new BadRequestException('Invalid code');
    return true;
  }

  // disable MFA
  async disable(userId: string) {
    await this.prisma.totpMfa.deleteMany({ where: { userId } }).catch(() => {});
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false },
    });
    return { ok: true };
  }

  // Create short-lived challenge token stored in Redis for login flow
  async createChallenge(userId: string) {
    const token = newOpaqueToken('mfa'); // random string
    const key = this.challengeKey(token);
    await this.redis.c.set(key, userId, { EX: CHALLENGE_TTL });
    return token;
  }

  async consumeChallenge(token: string) {
    const key = this.challengeKey(token);
    const userId = await this.redis.c.get(key);
    if (!userId) throw new BadRequestException('Invalid or expired challenge');
    await this.redis.c.del(key);
    return userId;
  }

  private challengeKey(token: string) {
    return `mfa:challenge:${token}`;
  }

  async generateRecoveryCodes(userId: string, count = 10) {
    // remove existing unused codes for safety (optional)
    await this.prisma.recoveryCode
      .deleteMany({ where: { userId } })
      .catch(() => {});
    const codes = generateRecoveryCodes(count);
    const hashed = await Promise.all(codes.map((c) => hashRecoveryCode(c)));

    // store hashed codes
    const rows = hashed.map((h) => ({ userId, codeHash: h }));
    // bulk create
    await this.prisma.recoveryCode.createMany({ data: rows });

    // return plaintext codes to show to user (must be shown only once)
    return codes;
  }
  /**
   * Verify and consume a recovery code for a user.
   * Returns true on success and marks the code used.
   */
  async consumeRecoveryCodeForUser(userId: string, code: string) {
    // fetch unused codes (limit to reasonable number)
    const candidates = await this.prisma.recoveryCode.findMany({
      where: { userId, usedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    for (const c of candidates) {
      try {
        const ok = await verifyRecoveryCode(code, c.codeHash);
        if (ok) {
          // mark used
          await this.prisma.recoveryCode.update({
            where: { id: c.id },
            data: { usedAt: new Date() },
          });
          // optionally revoke existing MFA enrollment? keep mfaEnabled true but allow login
          return true;
        }
      } catch (err) {
        // argon verify can throw for malformed hash; ignore and continue
      }
    }
    return false;
  }

  /**
   * Count unused recovery codes for user
   */
  async countUnusedRecoveryCodes(userId: string) {
    return this.prisma.recoveryCode.count({ where: { userId, usedAt: null } });
  }
}
