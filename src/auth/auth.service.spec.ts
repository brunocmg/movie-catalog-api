import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { HashingServiceProtocol } from './hash/hashing.service';
import jwtConfig from './config/jwt.config';

const prismaMock = { user: { findFirst: jest.fn() } };
const hashingMock = { compare: jest.fn() };
const jwtServiceMock = { signAsync: jest.fn() };
const jwtConfigMock = {
  secret: 'test-secret',
  audience: 'test-audience',
  issuer: 'test-issuer',
  jwtTtl: 3600,
};

describe('AuthService', () => {
  let service: AuthService;
  const signInDto = { email: 'bruno@teste.com', password: '123456' };
  const invalidCredentials = new UnauthorizedException('Invalid credentials');

  beforeEach(async () => {
    jest.resetAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: HashingServiceProtocol, useValue: hashingMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: jwtConfig.KEY, useValue: jwtConfigMock },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('should reject an unknown email with the generic message', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    hashingMock.compare.mockResolvedValue(false);

    await expect(service.authenticate(signInDto)).rejects.toThrow(
      invalidCredentials,
    );
    // compara contra o hash dummy, para o tempo de resposta não revelar o e-mail
    expect(hashingMock.compare).toHaveBeenCalledWith(
      signInDto.password,
      expect.any(String),
    );
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  it('should reject a wrong password with the same message', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 1,
      name: 'Bruno',
      email: signInDto.email,
      passwordHash: 'hash_do_banco',
    });
    hashingMock.compare.mockResolvedValue(false);

    await expect(service.authenticate(signInDto)).rejects.toThrow(
      invalidCredentials,
    );
    expect(hashingMock.compare).toHaveBeenCalledWith(
      signInDto.password,
      'hash_do_banco',
    );
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  it('should only look up active users', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    hashingMock.compare.mockResolvedValue(false);

    await expect(service.authenticate(signInDto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: { email: signInDto.email, active: true },
    });
  });

  it('should return the user data and a signed token on success', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 1,
      name: 'Bruno',
      email: signInDto.email,
      passwordHash: 'hash_do_banco',
    });
    hashingMock.compare.mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue('jwt-token');

    const result = await service.authenticate(signInDto);

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(
      { sub: 1, email: signInDto.email },
      {
        secret: jwtConfigMock.secret,
        expiresIn: jwtConfigMock.jwtTtl,
        audience: jwtConfigMock.audience,
        issuer: jwtConfigMock.issuer,
      },
    );
    expect(result).toEqual({
      id: 1,
      name: 'Bruno',
      email: signInDto.email,
      token: 'jwt-token',
    });
    expect(result).not.toHaveProperty('passwordHash');
  });
});
