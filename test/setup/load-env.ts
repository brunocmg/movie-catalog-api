import { config } from 'dotenv';

// Localmente lê o .env.test; no CI o arquivo não existe e as variáveis
// vêm do ambiente do workflow (que têm prioridade, pois não há override).
config({ path: '.env.test', quiet: true });
