import { config } from 'dotenv';

config({ path: '.env.test', quiet: true });

process.env.THROTTLE_LIMIT = '10000';
process.env.THROTTLE_AUTH_LIMIT = '10000';
delete process.env.CORS_ORIGINS;
process.env.LOG_LEVEL = 'silent';
