const C = require('../lib/core');
const { buildLua } = require('../lib/template');

module.exports = C.wrap(async (req, res) => {
  const session = C.auth(req, 'user');
  const u = await C.getUser(session.u);
  if (!u) C.fail('Akun tidak ditemukan.', 401);
  if (u.disabled) C.fail('Akun dinonaktifkan oleh admin.', 403);

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const lua = buildLua({
    apiUrl: 'https://' + host,
    key: u.key,
    username: u.username,
    config: C.cleanConfig(u.config),
    code: u.code || C.DEFAULT_CODE,
  });

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="4MankkLicense.lua"');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(lua);
});
