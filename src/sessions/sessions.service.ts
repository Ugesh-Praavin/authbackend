import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { hashToken, newOpaqueToken, verifyToken } from '../common/token.util';
import { addDays } from 'date-fns';

@Injectable()
export class SessionsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async createSession(userId: string, ip?: string | null, ua?: string | null) {
    const raw = newOpaqueToken('sess');
    const hash = await hashToken(raw);
    const days = Number(process.env.SESSION_TTL_DAYS || 30);
    const expiresAt = addDays(new Date(), days);

    const session = await this.prisma.session.create({
      data: {
        userId,
        sessionHash: hash,
        ip: ip ?? undefined,
        userAgent: ua ?? undefined,
        expiresAt,
      },
      select: { id: true, userId: true, expiresAt: true, sessionHash: true },
    });

    await this.redis.c.set(this.redisKey(raw), session.id, {
      EX: days * 24 * 60 * 60,
    });
    return { raw, session };
  }

  async rotate(
    raw: string | undefined,
    ip?: string | null,
    ua?: string | null,
  ) {
    if (!raw) throw new UnauthorizedException();
    const user = await this.userFromRaw(raw);
    await this.deleteByRaw(raw);
    return this.createSession(user.id, ip, ua);
  }

  async deleteAllForUser(userId: string) {
    await this.prisma.session.deleteMany({ where: { userId } });
    // (Optional) also purge redis keys if you maintain a reverse index
  }

  async validate(raw: string) {
    if (!raw) throw new UnauthorizedException();

    const cachedId = await this.redis.c.get(this.redisKey(raw));
    let session: {
      id: string;
      userId: string;
      sessionHash: string;
      expiresAt: Date;
    } | null = null;

    if (cachedId) {
      session = await this.prisma.session.findUnique({
        where: { id: cachedId },
        select: { id: true, userId: true, sessionHash: true, expiresAt: true },
      });
    } else {
      session = await this.lookupByRawHash(raw);
    }

    if (!session) throw new UnauthorizedException();

    if (session.expiresAt < new Date()) {
      await this.prisma.session
        .delete({ where: { id: session.id } })
        .catch(() => {});
      throw new UnauthorizedException();
    }

    const ok = await verifyToken(raw, session.sessionHash);
    if (!ok) throw new UnauthorizedException();

    return session;
  }

  async deleteByRaw(raw: string) {
    const cachedId = await this.redis.c.get(this.redisKey(raw));
    if (cachedId) {
      await this.prisma.session
        .delete({ where: { id: cachedId } })
        .catch(() => {});
      await this.redis.c.del(this.redisKey(raw));
      return;
    }
    const found = await this.lookupByRawHash(raw);
    if (found) {
      await this.prisma.session
        .delete({ where: { id: found.id } })
        .catch(() => {});
    }
  }

  async userFromRaw(raw: string) {
    const session = await this.validate(raw);
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, emailVerified: true, mfaEnabled: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private redisKey(raw: string) {
    return `sess:${raw}`;
  }

  private async lookupByRawHash(raw: string): Promise<{
    id: string;
    userId: string;
    sessionHash: string;
    expiresAt: Date;
  } | null> {
    // Not implemented — we rely on Redis mapping. Return null for fallback.
    return null;
  }
}
