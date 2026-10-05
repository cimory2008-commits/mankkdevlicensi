const C = require('../lib/core');

module.exports = C.wrap(async (req, res) => {
  if (req.method !== 'POST') C.fail('Method not allowed', 405);
  const b = C.body(req);
  const username = String(b.username || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (!username || !password) C.fail('Isi username dan password.');

  // Admin (dari env Vercel)
  const adminUser = (process.env.ADMIN_USER || 'admin').toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || '';
  if (adminPass && username === adminUser && C.safeEq(password, adminPass)) {
    return C.send(res, 200, { token: C.signToken({ u: adminUser, role: 'admin' }), role: 'admin', username: adminUser });
  }

  // User biasa
  const u = /^[a-z0-9_]{3,20}$/.test(username) ? await C.getUser(username) : null;
  if (!u || !C.safeEq(C.hashPw(password, u.salt), u.hash)) C.fail('Username atau password salah.', 401);
  if (u.disabled) C.fail('Akun dinonaktifkan oleh admin.', 403);
  C.send(res, 200, { token: C.signToken({ u: u.username, role: 'user' }), role: 'user', username: u.username });
});
