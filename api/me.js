const C = require('../lib/core');

module.exports = C.wrap(async (req, res) => {
  if (req.method !== 'POST') C.fail('Method not allowed', 405);
  const session = C.auth(req, 'user');
  const b = C.body(req);
  const u = await C.getUser(session.u);
  if (!u) C.fail('Akun tidak ditemukan.', 401);
  if (u.disabled) C.fail('Akun dinonaktifkan oleh admin.', 403);

  const out = () => C.send(res, 200, { user: C.publicUser(u) });

  if (b.action === 'get') return out();

  if (b.action === 'addUniverse') {
    const id = C.cleanUid(b.universeId);
    if (u.universes.includes(id)) C.fail('Universe ID sudah ada di akunmu.');
    if (u.universes.length >= u.limit) C.fail(`Limit tercapai (${u.limit}). Hubungi admin untuk menambah limit.`);
    const ok = await C.redis('SET', 'uni:' + id, u.username, 'NX');
    if (!ok) C.fail('Universe ID ini sudah terdaftar di akun lain.');
    u.universes.push(id);
    await C.saveUser(u);
    return out();
  }

  if (b.action === 'removeUniverse') {
    const id = C.cleanUid(b.universeId);
    if (u.universes.includes(id)) {
      u.universes = u.universes.filter(x => x !== id);
      const owner = await C.redis('GET', 'uni:' + id);
      if (owner === u.username) await C.redis('DEL', 'uni:' + id);
      await C.saveUser(u);
    }
    return out();
  }

  if (b.action === 'save') {
    u.config = C.cleanConfig(b.config);
    const code = String(b.code ?? '');
    if (code.length > 60000) C.fail('Source code terlalu panjang (maks 60.000 karakter).');
    u.code = code;
    await C.saveUser(u);
    return out();
  }

  C.fail('Action tidak dikenal.');
});
