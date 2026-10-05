const C = require('../lib/core');

// Dipanggil oleh script Roblox: GET /api/verify?key=...&universe=...
module.exports = C.wrap(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const key = String((req.query && req.query.key) || '').trim();
  const uid = String((req.query && req.query.universe) || '').replace(/\D/g, '');

  let user = null;
  if (/^MANKK-[0-9A-F-]{19}$/.test(key)) {
    const name = await C.redis('GET', 'lic:' + key);
    if (name) user = await C.getUser(name);
  }

  if (!user) {
    return C.send(res, 200, { ok: false, reason: 'invalid_key', message: 'License key tidak valid. Download ulang script dari dashboard.', config: C.DEFAULT_CONFIG });
  }

  const cfg = C.cleanConfig(user.config);
  const msg = cfg.lockMessage.replace(/\{name\}/g, cfg.hubName);
  const out = (ok, reason, message) => C.send(res, 200, { ok, reason, message, config: cfg });

  if (user.disabled) return out(false, 'disabled', 'Akun lisensi dinonaktifkan oleh admin.');
  if (!uid || uid === '0') return out(false, 'not_published', 'Game belum dipublish. Publish game agar Universe ID terbaca, lalu daftarkan di dashboard.');
  if (!user.universes.includes(uid)) return out(false, 'universe_not_registered', msg);
  out(true, 'ok', 'OK');
});
