const C = require('../lib/core');

module.exports = C.wrap(async (req, res) => {
  if (req.method !== 'POST') C.fail('Method not allowed', 405);
  C.auth(req, 'admin');
  const b = C.body(req);

  if (b.action === 'list') {
    const names = (await C.redis('SMEMBERS', 'users')) || [];
    const raws = names.length ? await C.redis('MGET', ...names.map(n => 'u:' + n)) : [];
    const users = raws.filter(Boolean).map(r => C.publicUser(JSON.parse(r)))
      .sort((a, c) => c.createdAt - a.createdAt);
    return C.send(res, 200, { users });
  }

  if (b.action === 'create') {
    const username = C.cleanUsername(b.username);
    const password = String(b.password || '');
    if (password.length < 6) C.fail('Password minimal 6 karakter.');
    const limit = C.cleanLimit(b.limit);
    if (username === (process.env.ADMIN_USER || 'admin').toLowerCase()) C.fail('Username dipakai admin.');
    const salt = C.crypto.randomBytes(16).toString('hex');
    const key = C.genKey();
    const user = {
      username, salt, hash: C.hashPw(password, salt), key, limit, disabled: false,
      universes: [], config: { ...C.DEFAULT_CONFIG }, code: C.DEFAULT_CODE, createdAt: Date.now(),
    };
    const ok = await C.redis('SET', 'u:' + username, JSON.stringify(user), 'NX');
    if (!ok) C.fail('Username sudah ada.');
    await C.redis('SADD', 'users', username);
    await C.redis('SET', 'lic:' + key, username);
    return C.send(res, 200, { ok: true });
  }

  const username = C.cleanUsername(b.username);
  const u = await C.getUser(username);
  if (!u) C.fail('User tidak ditemukan.', 404);

  if (b.action === 'update') {
    if (b.limit !== undefined) u.limit = C.cleanLimit(b.limit);
    if (b.disabled !== undefined) u.disabled = !!b.disabled;
    if (b.password) {
      if (String(b.password).length < 6) C.fail('Password minimal 6 karakter.');
      u.salt = C.crypto.randomBytes(16).toString('hex');
      u.hash = C.hashPw(b.password, u.salt);
    }
    await C.saveUser(u);
    return C.send(res, 200, { ok: true });
  }

  if (b.action === 'resetkey') {
    await C.redis('DEL', 'lic:' + u.key);
    u.key = C.genKey();
    await C.redis('SET', 'lic:' + u.key, username);
    await C.saveUser(u);
    return C.send(res, 200, { ok: true });
  }

  if (b.action === 'removeUniverse') {
    const id = C.cleanUid(b.universeId);
    u.universes = u.universes.filter(x => x !== id);
    await C.redis('DEL', 'uni:' + id);
    await C.saveUser(u);
    return C.send(res, 200, { ok: true });
  }

  if (b.action === 'delete') {
    for (const id of u.universes) await C.redis('DEL', 'uni:' + id);
    await C.redis('DEL', 'lic:' + u.key);
    await C.redis('DEL', 'u:' + username);
    await C.redis('SREM', 'users', username);
    return C.send(res, 200, { ok: true });
  }

  C.fail('Action tidak dikenal.');
});
