import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ConfigType } from '@nestjs/config';
import jwtConfig from '../config/jwt.config';
import { PrismaService } from '../../prisma/prisma.service';
import { PayloadTokenDto } from '../dto/payload-token.dto';
import { AuthenticatedRequest } from '../types/authenticated-user';

@Injectable()
export class AuthTokenGuard implements CanActivate {
  private readonly logger = new Logger(AuthTokenGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: PayloadTokenDto;
    try {
      payload = await this.jwtService.verifyAsync<PayloadTokenDto>(token, {
        secret: this.jwtConfiguration.secret,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
      });
    } catch {
      this.logger.warn('Token verification failed');
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, active: true },
    });

    if (!user?.active) {
      this.logger.warn(
        `Access denied: user missing or inactive (sub=${payload.sub})`,
      );
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.user = { id: user.id, email: user.email, role: user.role };
    return true;
  }

  private extractBearerToken(
    request: AuthenticatedRequest,
  ): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
