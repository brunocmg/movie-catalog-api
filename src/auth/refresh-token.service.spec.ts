import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { RefreshTokenService } from './refresh-token.service';
import { PrismaService } from '../prisma/prisma.service';
import jwtConfig from './config/jwt.config';

const prismaMock = {
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const DAY = 24 * 60 * 60 * 1000;

const stored = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  userId: 1,
  familyId: 'family-1',
  tokenHash: sha256('old-token'),
  expiresAt: new Date(Date.now() + DAY),
  revokedAt: null,
  ...overrides,
});

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;

  beforeEach(async () => {
    jest.resetAllMocks();
    prismaMock.refreshToken.create.mockResolvedValue({});
    prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

    const module = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: jwtConfig.KEY, useValue: { refreshTtlMs: 7 * DAY } },
      ],
    }).compile();

    service = module.get(RefreshTokenService);
  });

  describe('issue', () => {
    it('stores only the hash of a random token, in a new family', async () => {
      const before = Date.now();
      const { token, expiresAt } = await service.issue(1);

      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes, base64url
      const data = (
        prismaMock.refreshToken.create.mock.calls[0] as [
          { data: Record<string, unknown> },
        ]
      )[0].data;
      expect(data.tokenHash).toBe(sha256(token));
      expect(data).not.toHaveProperty('token');
      expect(data.familyId).toMatch(/^[0-9a-f-]{36}$/);
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 7 * DAY);
    });

    it('starts a different family on every login', async () => {
      await service.issue(1);
      await service.issue(1);

      const families = prismaMock.refreshToken.create.mock.calls.map(
        (c: [{ data: { familyId: string } }]) => c[0].data.familyId,
      );
      expect(new Set(families).size).toBe(2);
    });
  });

  describe('rotate', () => {
    it('revokes the presented token and issues one in the same family', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(stored());
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.rotate('old-token');

      expect(prismaMock.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: sha256('old-token') },
      });
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: 10, revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });
      expect(result.userId).toBe(1);
      expect(result.refreshToken.token).not.toBe('old-token');
      expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 1,
          familyId: 'family-1',
        }) as object,
      });
    });

    it('rejects an unknown token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.rotate('nope')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an expired token without issuing a new one', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(
        stored({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.rotate('old-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
    });

    it('revokes the whole family when a rotated token is reused', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(
        stored({ revokedAt: new Date() }),
      );
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await expect(service.rotate('old-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });
      expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
    });

    it('treats a lost race (token revoked meanwhile) as reuse', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(stored());
      prismaMock.refreshToken.updateMany
        .mockResolvedValueOnce({ count: 0 }) // someone else rotated it first
        .mockResolvedValueOnce({ count: 1 }); // family revocation

      await expect(service.rotate('old-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prismaMock.refreshToken.updateMany).toHaveBeenLastCalledWith({
        where: { familyId: 'family-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });
    });
  });

  describe('revoke', () => {
    it('revokes the family of a known token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        familyId: 'family-1',
      });

      await service.revoke('old-token');

      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });
    });

    it('ignores unknown tokens (logout is idempotent)', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.revoke('nope')).resolves.toBeUndefined();
      expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });
});
