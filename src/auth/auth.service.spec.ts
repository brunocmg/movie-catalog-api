import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { HashingServiceProtocol } from './hash/hashing.service';
import { RefreshTokenService } from './refresh-token.service';
import jwtConfig from './config/jwt.config';

const prismaMock = { user: { findFirst: jest.fn(), findUnique: jest.fn() } };
const hashingMock = { compare: jest.fn() };
const jwtServiceMock = { signAsync: jest.fn() };
const refreshMock = {
  issue: jest.fn(),
  rotate: jest.fn(),
  revoke: jest.fn(),
  revokeAllForUser: jest.fn(),
};
const jwtConfigMock = {
  secret: 'test-secret',
  audience: 'test-audience',
  issuer: 'test-issuer',
  accessTtlSeconds: 900,
  refreshTtlMs: 7 * 24 * 60 * 60 * 1000,
};

const dbUser = {
  id: 1,
  name: 'Bruno',
  email: 'bruno@teste.com',
  role: Role.USER,
  passwordHash: 'db-hash',
};
const refreshExpiry = new Date('2030-01-01T00:00:00Z');

describe('AuthService', () => {
  let service: AuthService;
  const signInDto = { email: 'bruno@teste.com', password: '123456' };

  beforeEach(async () => {
    jest.resetAllMocks();
    jwtServiceMock.signAsync.mockResolvedValue('jwt-token');
    refreshMock.issue.mockResolvedValue({
      token: 'refresh-1',
      expiresAt: refreshExpiry,
    });

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: HashingServiceProtocol, useValue: hashingMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: RefreshTokenService, useValue: refreshMock },
        { provide: jwtConfig.KEY, useValue: jwtConfigMock },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('authenticate', () => {
    it('rejects an unknown e-mail with the generic message, still hashing', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      hashingMock.compare.mockResolvedValue(false);

      await expect(service.authenticate(signInDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
      // compares against a dummy hash so the timing does not reveal the e-mail
      expect(hashingMock.compare).toHaveBeenCalledWith(
        signInDto.password,
        expect.any(String),
      );
      expect(refreshMock.issue).not.toHaveBeenCalled();
    });

    it('rejects a wrong password with the same message', async () => {
      prismaMock.user.findFirst.mockResolvedValue(dbUser);
      hashingMock.compare.mockResolvedValue(false);

      await expect(service.authenticate(signInDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
      expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
    });

    it('only looks up active users', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      hashingMock.compare.mockResolvedValue(false);

      await expect(service.authenticate(signInDto)).rejects.toThrow();
      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: { email: signInDto.email, active: true },
      });
    });

    it('returns the user, a short-lived access token and a refresh token', async () => {
      prismaMock.user.findFirst.mockResolvedValue(dbUser);
      hashingMock.compare.mockResolvedValue(true);

      const result = await service.authenticate(signInDto);

      expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(
        { sub: 1, email: dbUser.email },
        {
          secret: 'test-secret',
          expiresIn: 900,
          audience: 'test-audience',
          issuer: 'test-issuer',
        },
      );
      expect(refreshMock.issue).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        user: { id: 1, name: 'Bruno', email: dbUser.email, role: Role.USER },
        accessToken: 'jwt-token',
        tokenType: 'Bearer',
        expiresIn: 900,
        refreshToken: 'refresh-1',
        refreshTokenExpiresAt: refreshExpiry,
      });
      expect(JSON.stringify(result)).not.toContain('db-hash');
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token and signs a new access token', async () => {
      refreshMock.rotate.mockResolvedValue({
        userId: 1,
        refreshToken: { token: 'refresh-2', expiresAt: refreshExpiry },
      });
      prismaMock.user.findUnique.mockResolvedValue({ ...dbUser, active: true });

      const result = await service.refresh('refresh-1');

      expect(refreshMock.rotate).toHaveBeenCalledWith('refresh-1');
      expect(result).toEqual({
        accessToken: 'jwt-token',
        tokenType: 'Bearer',
        expiresIn: 900,
        refreshToken: 'refresh-2',
        refreshTokenExpiresAt: refreshExpiry,
      });
    });

    it('rejects and revokes everything when the user was deactivated', async () => {
      refreshMock.rotate.mockResolvedValue({
        userId: 1,
        refreshToken: { token: 'refresh-2', expiresAt: refreshExpiry },
      });
      prismaMock.user.findUnique.mockResolvedValue({
        ...dbUser,
        active: false,
      });

      await expect(service.refresh('refresh-1')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(refreshMock.revokeAllForUser).toHaveBeenCalledWith(1);
      expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
    });
  });

  it('logout revokes the session of the given refresh token', async () => {
    await service.logout('refresh-1');
    expect(refreshMock.revoke).toHaveBeenCalledWith('refresh-1');
  });

  it('logoutEverywhere revokes every session of the user', async () => {
    await service.logoutEverywhere(1);
    expect(refreshMock.revokeAllForUser).toHaveBeenCalledWith(1);
  });
});
