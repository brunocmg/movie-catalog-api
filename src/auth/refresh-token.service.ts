import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import jwtConfig from './config/jwt.config';

const INVALID = 'Invalid or expired refresh token';

export type IssuedRefreshToken = { token: string; expiresAt: Date };

/**
 * Opaque refresh tokens with rotation and reuse detection.
 *
 * - The token is 32 random bytes; only its SHA-256 hash is stored, so a
 *   database leak does not expose usable tokens. A fast hash is fine here
 *   because the token has 256 bits of entropy (unlike a password).
 * - Every login starts a family. Every refresh revokes the presented token
 *   and issues a new one in the same family.
 * - Presenting a token that was already rotated means someone else used it
 *   first: the whole family is revoked and both parties must log in again.
 */
@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
  ) {}

  /** Starts a new family (login). */
  async issue(userId: number): Promise<IssuedRefreshToken> {
    // Housekeeping: drop this user's expired tokens.
    await this.prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });

    return this.create(userId, randomUUID());
  }

  /**
   * Validates and rotates a refresh token. Returns the owner and a new token.
   * Throws 401 for unknown, expired, revoked or reused tokens.
   */
  async rotate(
    token: string,
  ): Promise<{ userId: number; refreshToken: IssuedRefreshToken }> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash(token) },
    });

    if (!stored) throw new UnauthorizedException(INVALID);

    if (stored.revokedAt) {
      this.logger.warn(
        `Refresh token reuse detected, revoking family (user=${stored.userId})`,
      );
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException(INVALID);
    }

    if (stored.expiresAt <= new Date()) {
      throw new UnauthorizedException(INVALID);
    }

    // Atomic: only one of two concurrent requests with the same token wins.
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (count === 0) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException(INVALID);
    }

    return {
      userId: stored.userId,
      refreshToken: await this.create(stored.userId, stored.familyId),
    };
  }

  /** Logout: revokes the token's family. Unknown tokens are ignored. */
  async revoke(token: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash(token) },
      select: { familyId: true },
    });

    if (stored) await this.revokeFamily(stored.familyId);
  }

  /** Logout everywhere, also used when the password changes. */
  async revokeAllForUser(userId: number): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async create(
    userId: number,
    familyId: string,
  ): Promise<IssuedRefreshToken> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.config.refreshTtlMs);

    await this.prisma.refreshToken.create({
      data: { userId, familyId, tokenHash: hash(token), expiresAt },
    });

    return { token, expiresAt };
  }
}

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
