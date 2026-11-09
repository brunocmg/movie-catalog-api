// must be the first import of the spec: read when AppModule loads
export const AUTH_LIMIT = 3;

process.env.THROTTLE_AUTH_LIMIT = String(AUTH_LIMIT);
process.env.CORS_ORIGINS = 'https://front.example.com';
