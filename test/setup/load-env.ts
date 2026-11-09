import { config } from 'dotenv';

// Localmente lê o .env.test; no CI o arquivo não existe e as variáveis
// vêm do ambiente do workflow (que têm prioridade, pois não há override).
config({ path: '.env.test', quiet: true });

// The suites log in many times in a row from the same IP. Rate limiting has
// its own suite (rate-limit.e2e-spec.ts), so keep it out of the way here.
process.env.THROTTLE_LIMIT = '10000';
process.env.THROTTLE_AUTH_LIMIT = '10000';
delete process.env.CORS_ORIGINS;
