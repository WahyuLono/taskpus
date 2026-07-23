## Konteks

Sesi utama Supabase **sudah cookie-based** (`createBrowserClient` dari `@supabase/ssr`) — dugaan bahwa app masih pakai `localStorage` tidak akurat. Yang tersisa di `src/integrations/supabase/client.ts` hanya shim migrasi sekali-jalan untuk user lama.

Meskipun begitu, Anda melaporkan **role masih turun ke "Pengguna"** di custom domain (`taskpus.lovable.app`). Artinya root cause bukan pada storage, melainkan pada salah satu titik berikut. Plan ini melakukan investigasi berurutan lalu memperbaiki penyebab yang terkonfirmasi — bukan menebak.

## Hipotesis yang akan diverifikasi (berurutan)

1. **Cookie tidak benar-benar terkirim ke server pada hard refresh** — bisa karena:
   - Cookie Supabase pecah menjadi chunk (`sb-...-auth-token.0`, `.1`) tapi handler `getAll` / `setAll` di `client.ts` tidak mengumpulkan chunk dengan benar (JWT + refresh token bisa >4KB).
   - `SameSite=Lax` + hard-refresh top-level navigation seharusnya OK, tapi Cloudflare Worker preview vs custom domain punya asal berbeda — perlu konfirmasi request header `cookie` di production.
2. **Cookie terkirim tapi server middleware gagal decode** — `auth.getClaims()` dengan publishable key baru (`sb_publishable_...`) kadang butuh JWKS fetch; kalau gagal fallback, akan lempar `Unauthorized`. Middleware saat ini langsung lempar generic "No authorization header provided" — pesannya menyesatkan.
3. **`getCurrentUser` (role lookup) gagal** tapi UI menampilkan default "Pengguna" alih-alih error / redirect ke login — sehingga user *mengira* rolenya turun padahal request-nya gagal diam-diam.
4. **Race pada hard refresh**: attacher client memakai `getSession()` yang bergantung `cookieToSession` async; RPC pertama bisa lolos tanpa header, dan middleware server yang gagal baca cookie akan menolak.

## Rencana Investigasi & Perbaikan

### Fase 1 — Instrumentasi diagnostik (baca log, non-destruktif)
- Tambahkan log terstruktur satu kali di `src/integrations/supabase/auth-middleware.ts`:
  - apakah header `authorization` ada,
  - apakah header `cookie` ada dan berapa panjangnya,
  - nama-nama cookie Supabase yang terdeteksi (tanpa value),
  - jalur mana yang diambil (header / cookie / gagal),
  - error asli dari `getClaims()` bila ada — bukan pesan generik.
- Log ini dibaca via Cloudflare Worker logs setelah Anda hard-refresh di `taskpus.lovable.app`. Semua log dihapus setelah root cause dikonfirmasi.

### Fase 2 — Perbaiki penyebab yang terkonfirmasi
Berdasarkan hasil Fase 1, terapkan **satu** dari perbaikan berikut (bukan semuanya sekaligus):

**A. Bila cookie tidak terkirim / chunked cookie tidak tergabung**
- Perbaiki `getBrowserCookiesWithLegacySession` di `client.ts` supaya benar-benar mengembalikan semua chunk (`.0`, `.1`, dst.) dan hormati urutan.
- Perbaiki `setAll` supaya menulis ulang setiap chunk dengan `path=/` yang eksplisit dan `Domain` dikosongkan (biarkan browser mengikat ke host aktual, agar sama antara preview & custom domain).

**B. Bila `getClaims()` gagal decode publishable key baru**
- Ganti verifikasi di server middleware menjadi `supabaseFromCookies.auth.getUser()` (round-trip ke Auth server, lebih toleran terhadap format key) sebagai sumber kebenaran ID user, dan pakai `getSession()` hanya untuk ambil access_token yang akan diteruskan ke user-scoped client.

**C. Bila UI menampilkan "Pengguna" karena `getCurrentUser` gagal senyap**
- Di `src/hooks/use-current-user.ts` dan konsumer role (sidebar, guard admin): tampilkan state *loading* dan *error* eksplisit, jangan fallback ke label "Pengguna" saat query gagal. Bila error `Unauthorized`, arahkan re-login alih-alih menampilkan role default.

**D. Bila race attacher client**
- Di `src/integrations/supabase/auth-attacher.ts`: ganti bacaan awal ke `getUser()` (yang menunggu hydration Supabase selesai) dan pertahankan proactive refresh yang sudah ada. Hindari retry berbasis `setTimeout(100)` — pakai `Promise` resolusi dari `onAuthStateChange('INITIAL_SESSION')` sekali.

### Fase 3 — Verifikasi
- Login di `https://taskpus.lovable.app` sebagai Admin.
- Hard refresh `/dashboard`, `/lpd`, `/master/user`.
- Pindah tab lalu fokus kembali, tunggu > 1 jam untuk memicu token refresh, lalu buka halaman yang memakai server function (notifikasi, daftar LPD).
- Pastikan: sidebar tetap menampilkan "Admin", tidak ada toast/log `Unauthorized`, dan network tab menunjukkan cookie `sb-...-auth-token*` terkirim pada request awal.

### Fase 4 — Bersih-bersih
- Hapus semua log diagnostik dari Fase 1.
- Bila shim `localStorage` di `client.ts` sudah tidak dibutuhkan (semua user lama sudah dimigrasi), Anda bisa memutuskan menghapusnya di kesempatan terpisah.

## Detail Teknis

- File yang **berpotensi** disentuh (tergantung hasil investigasi): `src/integrations/supabase/auth-middleware.ts`, `src/integrations/supabase/client.ts`, `src/integrations/supabase/auth-attacher.ts`, `src/hooks/use-current-user.ts`, komponen konsumer role (sidebar/guard).
- Tidak ada perubahan skema database.
- Tidak ada dependency baru.

## Yang TIDAK Dilakukan

- Tidak menulis ulang `client.ts` "dari nol" untuk pindah ke cookie — itu sudah dilakukan sebelumnya.
- Tidak menambah `Domain=.lovable.app` pada cookie (akan bocor lintas project).
- Tidak menghapus shim legacy `localStorage` di plan ini (opsional, terpisah).