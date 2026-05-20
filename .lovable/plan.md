## Rencana Implementasi

### A. Login PNS/Petugas pakai NIP **atau** Username

**Masalah:** PNS yang punya username → `email_internal` tetap pakai NIP (karena `COALESCE(nip, username)`). Login pakai username kirim email yang salah → gagal.

**Solusi:** Lookup `email_internal` dulu sebelum `signInWithPassword`.

- Tambah server function publik `resolveLoginEmail(identifier)` di `src/lib/auth.functions.ts` (pakai `supabaseAdmin`, tanpa middleware):
  ```sql
  SELECT email_internal FROM master_user
  WHERE nip = :identifier OR lower(username) = lower(:identifier)
  LIMIT 1
  ```
- Rate-limit sederhana: validasi panjang input ≤20 char, regex aman.
- `src/routes/login.tsx`: panggil `resolveLoginEmail` → kalau hit, pakai email-nya; kalau null, tetap coba `${identifier}@lpd.internal` (fallback supaya error UX tetap "kredensial salah", bukan "user tidak ada").

### B. Unlock Edit Status Kepegawaian (NON ASN → ASN, satu arah)

**Aturan final:**
- `status_kepegawaian` boleh diedit **hanya** dari NON ASN → ASN. Sebaliknya ditolak di handler.
- Saat transisi: admin **wajib** input NIP + Golongan.
- `username` tetap terkunci di form edit (read-only).
- `email_internal` akan berubah otomatis dari `username@lpd.internal` → `nip@lpd.internal` → **harus** sync ke `auth.users.email`.

**Implementasi:**

1. Tambah handler `updateUser` di `src/lib/master-admin.functions.ts`:
   ```
   .middleware([requireSupabaseAuth])  // + cek role Admin
   .inputValidator(zod schema: id_user, nama, jabatan, unit, role_user, is_kepala_uptd, status_kepegawaian?, nip?, id_golongan?)
   .handler:
     - Load row lama
     - Tolak jika status lama = ASN dan input mau ubah jadi NON ASN
     - Tolak jika input ubah username (defense in depth)
     - Jika transisi NON ASN → ASN:
         - Validasi nip (digit, unique) & id_golongan ada
         - UPDATE master_user SET status='ASN', nip=..., id_golongan=...
         - SELECT email_internal baru
         - supabaseAdmin.auth.admin.updateUserById(id, { email: newEmail, email_confirm: true })
         - Jika auth update gagal: rollback row (UPDATE balik) lalu throw
     - Else: UPDATE field non-sensitif saja
   ```

2. `src/routes/_authenticated/master.user.tsx`:
   - Dialog Edit User: unlock dropdown `status_kepegawaian` **hanya jika** value awal = NON ASN. Untuk row ASN, tetap disabled.
   - Saat user pilih ASN → tampilkan field NIP & Golongan (wajib).
   - Tampilkan **alert** di dialog: *"Setelah disimpan, user ini harus login ulang menggunakan NIP baru."*
   - Username field selalu read-only di edit.

### C. Petugas Edit Profil Sendiri (Username + Password)

**Rute baru:** `src/routes/_authenticated/profil.tsx` (akses semua role, tidak hanya Petugas — biar Admin juga bisa).

**Tiga bagian terpisah:**

1. **Ubah Password** — `supabase.auth.updateUser({ password })` langsung di client (validasi min 6 char + konfirmasi). Tidak ada efek samping.

2. **Ubah Username** — server function `updateOwnUsername(username)` di `src/lib/me.functions.ts`:
   - `requireSupabaseAuth`, validasi 1–20 char, no `@`/whitespace, unique case-insensitive.
   - Load row user.
   - UPDATE `master_user.username`.
   - **Jika user status NON ASN** → `email_internal` berubah → sync `auth.users.email` via `supabaseAdmin.auth.admin.updateUserById`. Tampilkan peringatan di UI: *"Email login berubah, Anda akan logout otomatis."* Setelah sukses, panggil `supabase.auth.signOut()` dan redirect ke `/login`.
   - **Jika user status ASN** → `email_internal` tidak berubah (COALESCE pilih NIP) → cukup update kolom username, tidak perlu sign out.

3. **Info read-only:** NIP, status, golongan, jabatan, unit — supaya user lihat profilnya.

**Sidebar:** Tambah link "Profil Saya" → `/profil`.

### D. File yang Disentuh

- `src/lib/auth.functions.ts` (BARU) — `resolveLoginEmail`
- `src/lib/master-admin.functions.ts` — tambah `updateUser`
- `src/lib/me.functions.ts` — tambah `updateOwnUsername`
- `src/routes/login.tsx` — lookup sebelum signIn
- `src/routes/_authenticated/master.user.tsx` — dialog Edit User dengan unlock status bersyarat
- `src/routes/_authenticated/profil.tsx` (BARU) — form password + username + info
- `src/routes/_authenticated.tsx` (sidebar) — link Profil

### E. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Auth email berubah tapi DB sudah commit (atau sebaliknya) | Urutan: update DB → update auth → kalau auth gagal, rollback DB dalam try/catch. Tidak pakai transaksi DB lintas service, tapi window race sangat kecil. |
| User aktif kena logout mendadak | Peringatan eksplisit di UI sebelum simpan + auto signOut + redirect login |
| Username conflict case-insensitive | Unique index `lower(username)` sudah ada; tangani error `23505` jadi pesan "username sudah dipakai" |
| Identifier login ambigu (NIP sama dengan username orang lain) | Tidak mungkin: NIP unik, username unik, dan dipisahkan domain numeric — tapi `OR` di lookup tetap aman karena dua kolom unik |
| Petugas spam ganti username | Server function di-rate-limit Supabase default; tidak ada throttling khusus (bisa ditambah nanti kalau perlu) |

### F. Tidak Diperlukan Migrasi DB

Semua skema sudah cukup. Generated column `email_internal` sudah handle COALESCE dengan benar; tinggal kode aplikasi yang sinkron ke auth.users.

### G. Verifikasi Akhir

1. Buat user NON ASN baru → login pakai username → ✅
2. Buat user ASN dengan username opsional → login pakai NIP → ✅, login pakai username → ✅ (via resolveLoginEmail)
3. Admin edit user NON ASN → ASN, isi NIP+Golongan → simpan → user lama logout, login ulang pakai NIP → ✅
4. Admin coba edit ASN → NON ASN → ditolak ✅
5. Petugas ASN ganti username sendiri → tetap login, tidak logout ✅
6. Petugas NON ASN ganti username sendiri → auto logout, login ulang pakai username baru ✅
7. Semua role ganti password sendiri → tetap login (Supabase keep session) ✅
