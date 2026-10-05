// 4Mankkdev License System - core helpers (tanpa dependency npm)
const crypto = require('crypto');

const R_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const R_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const SECRET = process.env.SESSION_SECRET || '';

// ---------- Database (Upstash Redis via REST, pakai fetch bawaan) ----------
async function redis(...cmd) {
  if (!R_URL || !R_TOKEN) fail('Database belum terhubung. Isi env Upstash/KV di Vercel.', 500);
  const r = await fetch(R_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + R_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

// ---------- Response helpers ----------
function fail(msg, status = 400) { const e = new Error(msg); e.status = status; throw e; }
function send(res, code, obj) { res.status(code).json(obj); }
const wrap = fn => async (req, res) => {
  try { await fn(req, res); } catch (e) { send(res, e.status || 500, { error: e.message || 'Server error' }); }
};
function body(req) {
  try { return typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch { return {}; }
}

// ---------- Session token (HMAC) ----------
const hmac = s => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
function signToken(p) {
  if (!SECRET) fail('SESSION_SECRET belum diisi di Vercel.', 500);
  const b = Buffer.from(JSON.stringify({ ...p, exp: Date.now() + 7 * 864e5 })).toString('base64url');
  return b + '.' + hmac(b);
}
function readToken(t) {
  if (!t || !SECRET) return null;
  const [b, sig] = String(t).split('.');
  if (!b || !sig) return null;
  const a = Buffer.from(sig), e = Buffer.from(hmac(b));
  if (a.length !== e.length || !crypto.timingSafeEqual(a, e)) return null;
  try {
    const p = JSON.parse(Buffer.from(b, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}
function auth(req, role) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : (req.query && req.query.token);
  const p = readToken(t);
  if (!p || p.role !== role) fail('Sesi tidak valid, silakan login ulang.', 401);
  return p;
}

// ---------- Password ----------
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const safeEq = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const genKey = () => 'MANKK-' + [1, 2, 3, 4].map(() => crypto.randomBytes(2).toString('hex').toUpperCase()).join('-');

// ---------- User store ----------
const DEFAULT_CONFIG = {
  hubName: '4Mankkdev',
  logoId: '93745581014217',
  accent: '#6ea8ff',
  lockTitle: 'AKSES DITOLAK',
  lockMessage: 'Game ini belum memiliki akses ke {name}. Hubungi developer untuk mendaftarkan Universe ID game ini.',
};
const DEFAULT_CODE = `-- Tulis script game kamu di sini.
-- Kode ini HANYA berjalan setelah Universe ID game terverifikasi.
print("[" .. Mankk.Config.HubName .. "] Lisensi valid, script aktif!")
`;

function cleanConfig(c = {}) {
  const s = (v, max, d) => { v = String(v ?? '').replace(/[\u0000-\u001f\ud800-\udfff]/g, '').trim().slice(0, max); return v || d; };
  return {
    hubName: s(c.hubName, 40, DEFAULT_CONFIG.hubName),
    logoId: (String(c.logoId || '').match(/\d+/) || [DEFAULT_CONFIG.logoId])[0].slice(0, 20),
    accent: /^#[0-9a-f]{6}$/i.test(c.accent || '') ? c.accent : DEFAULT_CONFIG.accent,
    lockTitle: s(c.lockTitle, 40, DEFAULT_CONFIG.lockTitle),
    lockMessage: s(c.lockMessage, 300, DEFAULT_CONFIG.lockMessage),
  };
}
const cleanUsername = u => {
  u = String(u || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(u)) fail('Username 3-20 karakter: huruf kecil, angka, underscore.');
  return u;
};
const cleanLimit = l => {
  l = parseInt(l, 10);
  if (!Number.isFinite(l) || l < 0 || l > 1000) fail('Limit harus angka 0-1000.');
  return l;
};
const cleanUid = v => {
  const u = String(v || '').trim();
  if (!/^\d{1,20}$/.test(u)) fail('Universe ID harus berupa angka.');
  return u;
};

async function getUser(name) {
  const raw = await redis('GET', 'u:' + name);
  return raw ? JSON.parse(raw) : null;
}
const saveUser = u => redis('SET', 'u:' + u.username, JSON.stringify(u));
const publicUser = u => {
  const { salt, hash, ...rest } = u;
  return rest;
};

module.exports = {
  redis, fail, send, wrap, body, signToken, readToken, auth, hashPw, safeEq, genKey,
  DEFAULT_CONFIG, DEFAULT_CODE, cleanConfig, cleanUsername, cleanLimit, cleanUid,
  getUser, saveUser, publicUser, crypto,
};
