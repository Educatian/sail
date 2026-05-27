// Loads server/.env into process.env BEFORE any module reads it.
// Must be the first import in index.ts (ESM evaluates imports depth-first, in order).
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
try {
  if (existsSync(envPath)) process.loadEnvFile(envPath);
} catch {
  /* no .env or unsupported runtime — fall back to ambient env */
}
