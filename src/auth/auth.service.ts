import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as argon2 from 'argon2';
import { MailerService } from '../mailer/mailer.service';
import { newMagicToken, hashMagic } from '../common/magic.util';
import { addMinutes } from 'date-fns';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private mailer: MailerService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Email already in use');
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });
    const user = await this.prisma.user.create({
      data: { email, passwordHash },
    });

    await this.sendVerifyEmail(user.id, user.email);
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    };
  }

  async validateUser(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash)
      throw new UnauthorizedException('Invalid credentials');
    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  // ——— EMAIL VERIFICATION ———

  async sendVerifyEmail(userId: string, email: string) {
    const token = newMagicToken('verify');
    const tokenHash = await hashMagic(token);
    const expiresAt = addMinutes(new Date(), 30); // 30 min

    await this.prisma.magicLink.create({
      data: {
        userId,
        type: 'VERIFY_EMAIL',
        tokenHash,
        expiresAt,
      },
    });

    const url = `${process.env.APP_URL}/auth/verify?token=${token}`;
    const html = `
      <p>Verify your email for Auth Service.</p>
      <p><a href="${url}">Click to verify</a> (valid 30 minutes)</p>
    `;
    await this.mailer.send(email, 'Verify your email', html);
  }

  async verifyEmail(token: string) {
    // NOTE: cannot recompute argon2 hash deterministically; we need to check by verifying against candidates.
    // We avoid scanning the table by enforcing short TTL + delete on use. We’ll fetch recent links of type VERIFY_EMAIL.
    const links = await this.prisma.magicLink.findMany({
      where: {
        type: 'VERIFY_EMAIL',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 200, // small window
    });

    for (const link of links) {
      const ok = await argon2.verify(link.tokenHash, token);
      if (ok) {
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: link.userId },
            data: { emailVerified: true },
          }),
          this.prisma.magicLink.update({
            where: { id: link.id },
            data: { usedAt: new Date() },
          }),
        ]);
        return { ok: true };
      }
    }
    throw new BadRequestException('Invalid or expired token');
  }

  // ——— PASSWORD RESET ———

  async sendResetEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    // Always respond 204 even if user not found (no user enumeration)
    if (!user) return;

    const token = newMagicToken('reset');
    const tokenHash = await hashMagic(token);
    const expiresAt = addMinutes(new Date(), 30);

    await this.prisma.magicLink.create({
      data: { userId: user.id, type: 'RESET_PASSWORD', tokenHash, expiresAt },
    });

    // Redirect to your frontend reset page. Backend endpoint will accept token+newPassword.
    const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const html = `
      <p>Reset your password.</p>
      <p><a href="${url}">Reset link</a> (valid 30 minutes)</p>
    `;
    await this.mailer.send(user.email, 'Reset your password', html);
  }

  async performReset(token: string, newPassword: string) {
    const links = await this.prisma.magicLink.findMany({
      where: {
        type: 'RESET_PASSWORD',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    for (const link of links) {
      const ok = await argon2.verify(link.tokenHash, token);
      if (ok) {
        const passwordHash = await argon2.hash(newPassword, {
          type: argon2.argon2id,
        });
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: link.userId },
            data: { passwordHash },
          }),
          this.prisma.magicLink.update({
            where: { id: link.id },
            data: { usedAt: new Date() },
          }),
          this.prisma.session.deleteMany({ where: { userId: link.userId } }), // revoke sessions
        ]);
        return { ok: true };
      }
    }
    throw new BadRequestException('Invalid or expired token');
  }
}
