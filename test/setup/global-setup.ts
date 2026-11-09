import { execSync } from 'node:child_process';
import './load-env';

export default function globalSetup() {
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
}
