import 'reflect-metadata';
import { NodeEnv, validateEnv } from './env.validation';

const valid = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
  JWT_TOKEN_AUDIENCE: 'http://localhost:3000',
  JWT_TOKEN_ISSUER: 'http://localhost:3000',
  JWT_TTL: '15m',
};

describe('validateEnv', () => {
  it('applies defaults and converts types', () => {
    const env = validateEnv({
      ...valid,
      PORT: '8080',
      SWAGGER_ENABLED: 'false',
    });

    expect(env).toMatchObject({
      NODE_ENV: NodeEnv.Development,
      PORT: 8080,
      SWAGGER_ENABLED: false,
      TRUST_PROXY: 0,
      THROTTLE_AUTH_LIMIT: 5,
    });
  });

  it.each([
    [undefined, true],
    ['true', true],
    [' TRUE ', true],
    ['false', false],
    ['0', false],
  ])('parses SWAGGER_ENABLED=%p as %p', (raw, expected) => {
    const env = validateEnv(
      raw === undefined ? valid : { ...valid, SWAGGER_ENABLED: raw },
    );
    expect(env.SWAGGER_ENABLED).toBe(expected);
  });

  it.each([
    ['JWT_SECRET', 'short', /JWT_SECRET must have at least 32 characters/],
    ['DATABASE_URL', 'mysql://x', /DATABASE_URL must be a postgresql/],
    ['JWT_TTL', 'forever', /JWT_TTL must be a duration/],
    ['NODE_ENV', 'staging', /NODE_ENV/],
    ['PORT', '70000', /PORT/],
  ])('rejects an invalid %s', (key, value, message) => {
    expect(() => validateEnv({ ...valid, [key]: value })).toThrow(message);
  });

  it('lists every missing variable at once', () => {
    expect(() => validateEnv({})).toThrow(
      /DATABASE_URL[\s\S]*JWT_SECRET[\s\S]*JWT_TOKEN_AUDIENCE/,
    );
  });
});
