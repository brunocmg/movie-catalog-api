import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import jwtConfig from '../config/jwt.config';
import type { ConfigType } from '@nestjs/config';
import { REQUEST_TOKEN_PAYLOAD_NAME } from '../common/auth.constant';
import { PrismaService } from '../../prisma/prisma.service';
import { PayloadTokenDto } from '../dto/payload-token.dto';

type RequestWithTokenPayload = Request & {
  [REQUEST_TOKEN_PAYLOAD_NAME]?: PayloadTokenDto;
};

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
    const request = context
      .switchToHttp()
      .getRequest<RequestWithTokenPayload>();
    const token = this.extractTokenHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token não encontrado!');
    }

    let payload: PayloadTokenDto;

    try {
      payload = await this.jwtService.verifyAsync<PayloadTokenDto>(token, {
        secret: this.jwtConfiguration.secret,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
      });
    } catch {
      this.logger.warn('Falha ao validar token');
      throw new UnauthorizedException('Acesso não autorizado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { active: true },
    });

    if (!user?.active) {
      this.logger.warn(
        `Acesso negado: usuário inexistente ou inativo (sub=${payload.sub})`,
      );
      throw new UnauthorizedException('Acesso não autorizado');
    }

    request[REQUEST_TOKEN_PAYLOAD_NAME] = payload;

    return true;
  }

  private extractTokenHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    return type === 'Bearer' ? token : undefined;
  }
}
