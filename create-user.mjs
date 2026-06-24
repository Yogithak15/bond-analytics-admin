/**
 * Add a user:
 *   node create-user.mjs email@example.com password123
 *   node create-user.mjs email@example.com password123 "Full Name"
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const env = readFileSync(resolve(__dirname, '.env'), 'utf8');
  for (const line of env.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
} catch {}

const [,, EMAIL, PASSWORD, NAME] = process.argv;

if (!EMAIL || !PASSWORD) {
  console.error('Usage: node create-user.mjs <email> <password> [name]');
  process.exit(1);
}

const PORT = process.env.AUTH_PORT || '3001';
// const INTERNAL_URL = `http://localhost:${PORT}`;
const INTERNAL_URL = `https://bondanalytics.bondbulls.in:${PORT}`;


const res = await fetch(`${INTERNAL_URL}/api/auth/sign-up/email`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Origin': INTERNAL_URL },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: NAME || EMAIL.split('@')[0] }),
});

const data = await res.json();
if (res.ok) {
  console.log('✓ User created:', data.user?.email);
} else {
  console.error('✗ Error:', data.message || JSON.stringify(data));
}
process.exit(0);
