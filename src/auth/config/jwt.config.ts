import { registerAs } from '@nestjs/config';
import { parseDurationMs } from '../../common/utils/duration';

const DEFAULT_REFRESH_TTL = '7d';

// Presence and format are already checked by validateEnv at boot.
const env = (name: string): string => process.env[name] ?? '';

export default registerAs('jwt', () => ({
  secret: env('JWT_SECRET'),
  audience: env('JWT_TOKEN_AUDIENCE'),
  issuer: env('JWT_TOKEN_ISSUER'),
  /** Access token lifetime in seconds (numbers are unambiguous for jsonwebtoken). */
  accessTtlSeconds: Math.floor(parseDurationMs(env('JWT_TTL')) / 1000),
  /** Refresh token lifetime in milliseconds. */
  refreshTtlMs: parseDurationMs(
    process.env.JWT_REFRESH_TTL ?? DEFAULT_REFRESH_TTL,
  ),
}));
