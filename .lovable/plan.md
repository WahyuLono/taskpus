## Rencana Implementasi: Username untuk Login + Dukungan NON PNS

### A. Migrasi Database

1. **Tambah kolom `username`** di `master_user`:
   - Tipe `text`, nullable, maksimal 20 karakter.
   - Unique case-insensitive: `CREATE UNIQUE INDEX ON master_user (lower(username))`.
   - CHECK: panjang 1–20, tidak boleh mengandung `@` (agar tidak merusak email auth) dan tidak boleh whitespace.

2. **Jadikan `nip` NULLABLE** dan tambah unique partial index (untuk yang tidak NULL).

3. **Ubah generated column `email_internal`:**
   - Drop generated lama, buat ulang sebagai `GENERATED ALWAYS AS (COALESCE(nip, lower(username)) || '@lpd.internal') STORED`.

4. **CHECK constraint pada status_kepegawaian:**
   - `PNS` ⇒ `nip IS NOT NULL` (username tetap boleh ada sebagai alias).
   - `NON PNS` ⇒ `nip IS NULL AND username IS NOT NULL AND id_golongan IS NULL`.

### B. Form Login (`src/routes/login.tsx`)

- Ubah label field menjadi **"NIP / Username"**.
- Logic pembentukan email auth: jika input **semua digit** → pakai sebagai `nip`, selain itu pakai `username` (lowercased). Kirim `${identifier}@lpd.internal` ke `signInWithPassword`.
- Tidak perlu lookup ke DB sebelum login — karena `email_internal` selalu konsisten dengan salah satu identifier.

### C. Form Buat User (`src/routes/_authenticated/master.user.tsx` + `src/lib/master-admin.functions.ts`)

- UI: `status_kepegawaian` jadi pemicu field bersyarat.
  - **PNS** → tampilkan NIP (wajib), Username (opsional), Golongan (wajib).
  - **NON PNS** → sembunyikan NIP & Golongan, Username wajib.
- Zod schema baru:
  - `username`: opsional string 1–20 char tanpa `@`/whitespace.
  - Validasi silang: PNS perlu `nip`; NON PNS perlu `username` tanpa `nip` dan tanpa `id_golongan`.
- `createUser` handler:
  - Cek unik untuk yang terisi (NIP & username, lower-case).
  - Email auth: `${data.nip ?? data.username!.toLowerCase()}@lpd.internal`.
  - Insert tanpa mengirim `email_internal` (tetap dihasilkan otomatis).

### D. Tampilan Surat & Daftar User

- Helper `format.ts`: `formatNip(u) = u.nip ?? '-'`, `formatGolongan(u) = u.id_golongan ? namaGolongan : '-'`.
- Terapkan di:
  - Halaman daftar user (`master.user.tsx`) — kolom NIP & Golongan.
  - Halaman detail/cetak LPD (`lpd.$id.tsx`) — baris petugas & kepala UPTD.
  - Template Surat Perintah Tugas (saat fitur cetak ditambahkan nanti — pola sudah siap).

### E. File yang Akan Disentuh

- Migrasi SQL (1 migration).
- `src/integrations/supabase/types.ts` — regen otomatis setelah migrasi.
- `src/lib/master-admin.functions.ts` — schema + logic.
- `src/routes/_authenticated/master.user.tsx` — form & tabel.
- `src/routes/login.tsx` — input identifier.
- `src/lib/format.ts` — helper baru.
- `src/routes/_authenticated/lpd.$id.tsx` — tampilkan `-` untuk NON PNS.

### F. Catatan Risiko

- Data lama: semua user sekarang PNS dengan NIP — migrasi aman, tidak perlu backfill.
- `email_internal` yang sudah ada akan diregenerate otomatis saat kolom generated dibuat ulang (Postgres menghitung ulang nilai STORED).
- Hindari mengganti email auth pada `auth.users` untuk user lama — karena nilainya sudah `${nip}@lpd.internal`, tetap konsisten.

---

Setelah Anda menyetujui plan ini, saya akan: (1) jalankan migrasi, (2) update schema & UI, lalu (3) verifikasi alur login PNS lama + buat user baru NON PNS.