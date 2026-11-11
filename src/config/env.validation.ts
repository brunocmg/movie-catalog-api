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
import { DURATION_PATTERN } from '../common/utils/duration';

export enum LogLevel {
  Fatal = 'fatal',
  Error = 'error',
  Warn = 'warn',
  Info = 'info',
  Debug = 'debug',
  Trace = 'trace',
  Silent = 'silent',
}

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

// `value` was already coerced by enableImplicitConversion: Boolean('false') === true
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

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsEnum(LogLevel)
  LOG_LEVEL: LogLevel = LogLevel.Info;

  @IsOptional()
  @IsString()
  RENDER_GIT_COMMIT?: string;

  @IsOptional()
  @IsString()
  TMDB_API_TOKEN?: string;

  @IsOptional()
  @Matches(/^rediss?:\/\/.+/, {
    message: 'REDIS_URL must be a redis:// or rediss:// connection string',
  })
  REDIS_URL?: string;

  @IsInt()
  @Min(1)
  CACHE_TTL_SECONDS: number = 120;

  @Transform(toBoolean)
  @IsBoolean()
  METRICS_ENABLED: boolean = true;

  @IsOptional()
  @IsString()
  METRICS_TOKEN?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_CLOUD_NAME?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_API_KEY?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_API_SECRET?: string;

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

  @Matches(DURATION_PATTERN, {
    message: 'JWT_TTL must be a duration such as 900, 15m, 1h or 7d',
  })
  JWT_TTL: string;

  @Matches(DURATION_PATTERN, {
    message: 'JWT_REFRESH_TTL must be a duration such as 7d or 30d',
  })
  JWT_REFRESH_TTL: string = '7d';

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsInt()
  @Min(0)
  TRUST_PROXY: number = 0;

  @Transform(toBoolean)
  @IsBoolean()
  SWAGGER_ENABLED: boolean = true;

  @IsInt()
  @Min(1000)
  THROTTLE_TTL_MS: number = 60_000;

  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number = 100;

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

  const cloudinary = [
    env.CLOUDINARY_CLOUD_NAME,
    env.CLOUDINARY_API_KEY,
    env.CLOUDINARY_API_SECRET,
  ];
  if (cloudinary.some(Boolean) && !cloudinary.every(Boolean)) {
    throw new Error(
      'Invalid environment configuration:\n  - CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must be set together',
    );
  }

  if (errors.length > 0) {
    const details = errors
      .flatMap((e) => Object.values(e.constraints ?? {}))
      .map((msg) => `  - ${msg}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return env;
}
