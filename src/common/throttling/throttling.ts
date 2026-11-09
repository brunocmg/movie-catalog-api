import { ExecutionContext, SetMetadata } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { EnvironmentVariables } from '../../config/env.validation';

const STRICT_THROTTLE_KEY = 'throttle:strict';
const reflector = new Reflector();

export const StrictThrottle = () => SetMetadata(STRICT_THROTTLE_KEY, true);

const isStrict = (context: ExecutionContext) =>
  reflector.getAllAndOverride<boolean>(STRICT_THROTTLE_KEY, [
    context.getHandler(),
    context.getClass(),
  ]) === true;

export function throttlerOptions(
  config: ConfigService<EnvironmentVariables, true>,
): ThrottlerModuleOptions {
  const ttl = config.get('THROTTLE_TTL_MS', { infer: true });

  return {
    errorMessage: 'Too many requests, please try again later',
    throttlers: [
      {
        name: 'default',
        ttl,
        limit: config.get('THROTTLE_LIMIT', { infer: true }),
      },
      {
        name: 'auth',
        ttl,
        limit: config.get('THROTTLE_AUTH_LIMIT', { infer: true }),
        skipIf: (context) => !isStrict(context),
      },
    ],
  };
}
