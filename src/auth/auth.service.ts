import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { HashingServiceProtocol } from './hash/hashing.service';
import { RefreshTokenService } from './refresh-token.service';
import jwtConfig from './config/jwt.config';
import { SignInDto } from './dto/signin.dto';
import { ResponseSignInDto, TokensDto } from './dto/response-signin.dto';

// keeps the response time the same when the e-mail does not exist
const DUMMY_HASH =
  '$2a$10$/b/STTR8KX5yP3Ln6V.o7u1qUxDqmOEZRX3kzj/ERGzlmoz/gYRT6';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol,
    private readonly jwtService: JwtService,
    private readonly refreshTokens: RefreshTokenService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  async authenticate(signInDto: SignInDto): Promise<ResponseSignInDto> {
    const user = await this.prisma.user.findFirst({
      where: { email: signInDto.email, active: true },
    });

    const passwordIsValid = await this.hashingService.compare(
      signInDto.password,
      user?.passwordHash ?? DUMMY_HASH,
    );

    if (!user || !passwordIsValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(user.id, user.email);
    const refresh = await this.refreshTokens.issue(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt,
    };
  }

  async refresh(token: string): Promise<TokensDto> {
    const { userId, refreshToken } = await this.refreshTokens.rotate(token);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, active: true },
    });

    if (!user?.active) {
      await this.refreshTokens.revokeAllForUser(userId);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return {
      ...(await this.issueTokens(user.id, user.email)),
      refreshToken: refreshToken.token,
      refreshTokenExpiresAt: refreshToken.expiresAt,
    };
  }

  logout(token: string): Promise<void> {
    return this.refreshTokens.revoke(token);
  }

  logoutEverywhere(userId: number): Promise<void> {
    return this.refreshTokens.revokeAllForUser(userId);
  }

  private async issueTokens(
    userId: number,
    email: string,
  ): Promise<Pick<TokensDto, 'accessToken' | 'tokenType' | 'expiresIn'>> {
    const expiresIn = this.jwtConfiguration.accessTtlSeconds;

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email },
      {
        secret: this.jwtConfiguration.secret,
        expiresIn,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
      },
    );

    return { accessToken, tokenType: 'Bearer', expiresIn };
  }
}
