# 4Mankkdev License System

Website lisensi untuk script Roblox. Tanpa `npm install`, tanpa `package.json` (hanya fitur bawaan Node + Vercel).

## Struktur
```
public/index.html     -> website (login, admin, user, editor + preview)
public/logo.png       -> logo 4Mankkdev
api/login.js          -> login admin & user
api/admin.js          -> admin: buat user, limit, nonaktifkan, reset key, hapus
api/me.js             -> user: Universe ID, simpan config & source code
api/verify.js         -> dipanggil script Roblox untuk cek Universe ID
api/download.js       -> generate & download script .lua
lib/core.js           -> database (Upstash REST), auth, helper
lib/template.js       -> template script Lua
```

## Deploy (tanpa install apa pun)
1. Upload folder ini ke repo GitHub lewat browser (Add file > Upload files).
2. Di Vercel: **Add New > Project**, import repo tersebut, klik Deploy.
3. Di project Vercel: **Storage > Create Database > Upstash Redis** (Marketplace), lalu **Connect** ke project. Env `KV_REST_API_URL` dan `KV_REST_API_TOKEN` otomatis terisi.
4. **Settings > Environment Variables**, tambahkan:
   - `ADMIN_USER` : username admin kamu
   - `ADMIN_PASSWORD` : password admin (panjang & unik)
   - `SESSION_SECRET` : string acak panjang (min 32 karakter)
5. **Deployments > Redeploy** agar env terbaca.
6. Buka website, login sebagai admin, buat user.

## Alur
- Admin buat user + set limit Universe ID.
- User login, daftarkan Universe ID game, edit nama/logo/pesan/source code, lalu download script `.lua`.
- Script dipasang sebagai **Script** di `ServerScriptService`, dengan **Allow HTTP Requests** aktif.
- Saat game jalan, script cek `game.GameId` + license key ke `/api/verify`. Kalau belum terverifikasi: layar "Akses Ditolak" muncul dan semua player dikunci (WalkSpeed/Jump 0 + Anchored dari server). Dicek ulang tiap 5 menit, jadi kalau admin menonaktifkan akun atau menghapus Universe ID, game ikut terkunci.

## Catatan keamanan
- Script Lua berada di game milik user, jadi user yang niat bisa menghapus/mengubah pengecekan. Kode custom ada di dalam script yang sama, jadi kalau script dihapus fiturnya ikut hilang. Untuk perlindungan lebih kuat, simpan logika inti di server (loadstring dari API) atau obfuscate.
- Universe ID hanya bisa terdaftar di satu akun.
- Ganti `SESSION_SECRET` untuk logout semua sesi.
