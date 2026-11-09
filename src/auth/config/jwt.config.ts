import { registerAs } from '@nestjs/config';
import { parseDurationMs } from '../../common/utils/duration';

const DEFAULT_REFRESH_TTL = '7d';

const env = (name: string): string => process.env[name] ?? '';

export default registerAs('jwt', () => ({
  secret: env('JWT_SECRET'),
  audience: env('JWT_TOKEN_AUDIENCE'),
  issuer: env('JWT_TOKEN_ISSUER'),
  accessTtlSeconds: Math.floor(parseDurationMs(env('JWT_TTL')) / 1000),
  refreshTtlMs: parseDurationMs(
    process.env.JWT_REFRESH_TTL ?? DEFAULT_REFRESH_TTL,
  ),
}));
