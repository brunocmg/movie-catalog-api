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

  if (errors.length > 0) {
    const details = errors
      .flatMap((e) => Object.values(e.constraints ?? {}))
      .map((msg) => `  - ${msg}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return env;
}
