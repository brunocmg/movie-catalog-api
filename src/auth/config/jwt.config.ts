import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => {
  return {
    secret: process.env.JWT_SECRET,
    jwtTtl: process.env.JWT_TTL,
  };
});
