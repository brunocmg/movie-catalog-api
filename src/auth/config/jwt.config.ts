import { registerAs } from '@nestjs/config';
import type { StringValue } from 'ms';

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value;
};

export default registerAs('jwt', () => ({
  secret: required('JWT_SECRET'),
  audience: required('JWT_TOKEN_AUDIENCE'),
  issuer: required('JWT_TOKEN_ISSUER'),
  jwtTtl: required('JWT_TTL') as StringValue,
}));
