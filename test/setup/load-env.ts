import { config } from 'dotenv';

config({ path: '.env.test', quiet: true });

process.env.THROTTLE_LIMIT = '10000';
process.env.THROTTLE_AUTH_LIMIT = '10000';
delete process.env.CORS_ORIGINS;
process.env.LOG_LEVEL = 'silent';
delete process.env.CLOUDINARY_CLOUD_NAME;
delete process.env.CLOUDINARY_API_KEY;
delete process.env.CLOUDINARY_API_SECRET;
delete process.env.REDIS_URL;
delete process.env.METRICS_TOKEN;
delete process.env.METRICS_ENABLED;
