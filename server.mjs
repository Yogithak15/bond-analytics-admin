import express from 'express';
import cors from 'cors';
import { betterAuth } from 'better-auth';
import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env manually
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envContent = readFileSync(resolve(__dirname, '.env'), 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const BASE_URL = process.env.BETTER_AUTH_URL || `http://localhost:${parseInt(process.env.AUTH_PORT || '3001', 10)}`;
// LOCAL .env  → BETTER_AUTH_URL=http://localhost:3001
// PROD  .env  → BETTER_AUTH_URL=https://bondanalytics-auth.bondbulls.in
const PORT = parseInt(process.env.AUTH_PORT || '3001', 10);
const INTERNAL_URL = `http://localhost:${PORT}`; // always internal, same for local & prod

const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: BASE_URL,
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://bondanalytics.bondbulls.in',
    'https://bondanalytics-auth.bondbulls.in',
    'https://bondanalytics-api.bondbulls.in',
  ],
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
      requireLocalEmailVerified: false, // allow linking even if credential account has emailVerified=false
    },
  },
  advanced: { disableCSRFCheck: true },
});

const app = express();

app.use(cors({
  origin: (origin, cb) => cb(null, origin || true),
  credentials: true,
}));

// Convert Express req to Web API Request and pass to Better Auth handler
app.all('/api/auth/*path', async (req, res) => {
  try {
    const url = new URL(req.originalUrl, BASE_URL);
    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (val) headers.set(key, Array.isArray(val) ? val.join(', ') : val);
    }

    let body = undefined;
    if (!['GET', 'HEAD'].includes(req.method)) {
      body = await new Promise((resolve) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
      });
    }

    const webReq = new Request(url.toString(), {
      method: req.method,
      headers,
      body: body && body.length > 0 ? body : undefined,
    });

    const webRes = await auth.handler(webReq);

    res.status(webRes.status);
    webRes.headers.forEach((val, key) => res.setHeader(key, val));
    if (req.path.endsWith('/get-session')) {
      res.setHeader('Cache-Control', 'no-store');
      res.removeHeader('ETag');
    }
    const resBody = await webRes.text();
    res.send(resBody);
  } catch (err) {
    console.error('Auth handler error:', err);
    res.status(500).json({ error: 'Internal auth server error' });
  }
});

// ── Helper: verify session from cookie/header ──────────────────────────────
async function getSessionFromReq(req) {
  try {
    const url = new URL('/api/auth/get-session', INTERNAL_URL);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (v) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
    }
    const webReq = new Request(url.toString(), { method: 'GET', headers });
    const webRes = await auth.handler(webReq);
    if (!webRes.ok) return null;
    const data = await webRes.json();
    return data?.user ?? null;
  } catch {
    return null;
  }
}

app.use(express.json());

// GET /api/users — list all users
app.get('/api/users', async (req, res) => {
  const user = await getSessionFromReq(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await pool.query(
      'SELECT id, name, email, "emailVerified", "createdAt" FROM "user" ORDER BY "createdAt" DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// POST /api/users — create a new user
app.post('/api/users', async (req, res) => {
  const user = await getSessionFromReq(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
  try {
    const url = new URL('/api/auth/sign-up/email', INTERNAL_URL);
    const webReq = new Request(url.toString(), {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json', 'Origin': BASE_URL }),
      body: JSON.stringify({ name, email, password }),
    });
    const webRes = await auth.handler(webReq);
    const data = await webRes.json();
    if (!webRes.ok) return res.status(webRes.status).json(data);
    res.status(201).json({ user: data.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// DELETE /api/users/:id — delete a user
app.delete('/api/users/:id', async (req, res) => {
  const currentUser = await getSessionFromReq(req);
  if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });
  if (currentUser.id === req.params.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  try {
    await pool.query('DELETE FROM "user" WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ── Production: serve the React build ─────────────────────────────────────
const buildPath = resolve(__dirname, 'build');
if (existsSync(buildPath)) {
  app.use(express.static(buildPath));
  // All non-API routes serve index.html (SPA fallback)
  app.get('/{*splat}', (req, res) => { // Express 5 wildcard syntax — same for local & prod
    res.sendFile(resolve(buildPath, 'index.html'));
  });
  console.log('Serving React build from /build');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
