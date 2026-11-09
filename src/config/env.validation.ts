import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

// Reads the raw value from `obj`: with enableImplicitConversion, `value` has
// already gone through Boolean("false") === true.
const toBoolean = ({
  obj,
  key,
}: {
  obj: Record<string, unknown>;
  key: string;
}) => {
  const raw = obj[key];
  return typeof raw === 'string' ? raw.trim().toLowerCase() === 'true' : raw;
};

/**
 * Every environment variable the API reads. Validated once at boot so a
 * missing or malformed value fails fast with a clear message, instead of
 * breaking a request later.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @Matches(/^postgres(ql)?:\/\/.+/, {
    message: 'DATABASE_URL must be a postgresql:// connection string',
  })
  DATABASE_URL: string;

  @IsString()
  @MinLength(32, {
    message:
      'JWT_SECRET must have at least 32 characters (openssl rand -base64 48)',
  })
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_TOKEN_AUDIENCE: string;

  @IsString()
  @IsNotEmpty()
  JWT_TOKEN_ISSUER: string;

  @Matches(/^\d+\s*(ms|s|m|h|d|w|y)?$/i, {
    message: 'JWT_TTL must be a duration such as 900, 15m, 1h or 7d',
  })
  JWT_TTL: string;

  /** Comma-separated list of allowed origins, or `*`. Empty disables CORS. */
  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  /** Number of reverse proxies in front of the app (Render, Nginx...). */
  @IsInt()
  @Min(0)
  TRUST_PROXY: number = 0;

  @Transform(toBoolean)
  @IsBoolean()
  SWAGGER_ENABLED: boolean = true;

  @IsInt()
  @Min(1000)
  THROTTLE_TTL_MS: number = 60_000;

  /** Requests per window for any route. */
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number = 100;

  /** Login attempts per window, per client IP. */
  @IsInt()
  @Min(1)
  THROTTLE_AUTH_LIMIT: number = 5;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });

  const errors = validateSync(env, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .flatMap((e) => Object.values(e.constraints ?? {}))
      .map((msg) => `  - ${msg}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return env;
}
