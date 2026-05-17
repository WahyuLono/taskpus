
# Modul Data Master — Pusat Kendali Admin

Evaluasi PRD vs implementasi sekarang: **Fase 1 sudah jalan** (auth, dashboard, LPD list/baru/detail, tugas). Yang **belum** dibangun:

- ❌ Master Data CRUD (Golongan, Rangka, Tempat, User Pegawai)
- ❌ Pengaturan Sistem (settings_config)
- ❌ Halaman Cetak SPT
- ❌ Upload Laporan (foto + kompresi)
- ❌ Soft delete / Batal LPD

Sesuai permintaan: kerjakan **Modul Master Data dulu** sebagai pusat kendali admin.

## Scope iterasi ini

### Routes baru (semua di bawah `_authenticated/`, admin-only guard)
```
master.index.tsx       → landing master (4 kartu navigasi)
master.golongan.tsx    → CRUD Golongan
master.rangka.tsx      → CRUD Rangka kegiatan
master.tempat.tsx      → CRUD Tempat tujuan
master.user.tsx        → CRUD User Pegawai (Petugas/Kepala UPTD)
```

Sidebar dapat grup baru **"Data Master"** (collapsible) — hanya tampil untuk role Admin.

### UI pattern (konsisten 4 halaman)
- Header halaman: judul + tombol **"Tambah Baru"** (kanan atas, primary).
- Search bar + count.
- Tabel: nama kolom sesuai entitas + kolom Aksi (Edit / Hapus).
- Dialog (shadcn) untuk Create/Edit — form sederhana sesuai field.
- AlertDialog konfirmasi sebelum Hapus.
- Toast (sonner) untuk sukses/error.
- Empty state + skeleton loader.

### Detail per entitas

**1. Golongan** (`master_golongan`)
- Field: `nama_golongan` (text, required, unique check di server).
- Tabel: ID, Nama Golongan, Aksi.

**2. Rangka Kegiatan** (`master_rangka`)
- Field: `nama_rangka`.
- Sudah ada `listRangka` + `addRangka` server fn → tambah `updateRangka`, `deleteRangka`.

**3. Tempat Tujuan** (`master_tempat`)
- Field: `nama_tempat`.
- Sudah ada `listTempat` + `addTempat` → tambah update/delete.

**4. User Pegawai** (`master_user`) — paling kompleks
- Field: `nip` (unique), `nama`, `email_internal` (auto `${nip}@lpd.internal`), `status_kepegawaian` (ASN/Non-ASN), `role_user` (Admin/Petugas), `id_golongan` (select dari master_golongan), `jabatan`, `unit`, `is_kepala_uptd` (switch).
- Create user: butuh `supabaseAdmin` → buat auth user + insert master_user dalam 1 transaksi server fn (admin only).
- Edit: hanya update master_user (tidak ubah email auth kecuali NIP berubah → handle terpisah; iterasi ini **NIP tidak bisa diubah** setelah dibuat).
- Reset password: tombol → server fn pakai admin client `auth.admin.updateUserById`.
- Hapus: soft block jika user masih punya assignment di `detail_petugas` atau jadi kepala di `transaksi_lpd`. Kalau aman, hapus master_user + auth user.

### Server functions baru (`src/lib/master.functions.ts` + `master-admin.functions.ts`)
- `listGolongan` ✅ ada — tambah `addGolongan`, `updateGolongan`, `deleteGolongan`.
- `updateRangka`, `deleteRangka`.
- `updateTempat`, `deleteTempat`.
- `listAllUsers` (lebih lengkap dari `listPetugas`), `createUser` (admin client), `updateUser`, `deleteUser`, `resetUserPassword`.
- Semua write pakai `requireSupabaseAuth` + cek `has_role(uid, 'Admin')` di handler (RLS juga sudah enforce, tapi guard di app layer biar error message ramah).
- `createUser` & `resetUserPassword` perlu `supabaseAdmin` (service role) — file terpisah `*.admin.functions.ts` yang **hanya** berisi createServerFn (sesuai aturan import graph).

### Komponen helper
- `DataTable` reusable kecil (header + body + empty state) — atau langsung pakai shadcn `Table` per halaman (lebih simpel, tidak over-abstract).
- `EntityFormDialog` per halaman (form spesifik, tidak digeneralisasi).

### Validasi (zod)
- Nama: `min(2).max(120).trim()`.
- NIP: `regex(/^[0-9]{6,30}$/)`.
- Email internal: auto-derive, tidak diinput user.
- Role/status: enum sesuai DB.

### Guard admin
- `_authenticated.tsx` sudah expose currentUser. Tiap route master tambah cek di component: kalau bukan Admin → redirect ke `/dashboard` + toast.

## Yang TIDAK dikerjakan iterasi ini
- Pengaturan Sistem, Cetak SPT, Upload Laporan, Soft-delete LPD → iterasi berikutnya.
- Import bulk CSV user → nanti kalau diminta.

## Konfirmasi
- OK lanjut bangun semua 4 halaman master + user management (create/edit/delete + reset password) sekaligus?
- Atau pecah lagi: **(A)** Golongan/Rangka/Tempat dulu (simpel), **(B)** User management terpisah (lebih berat karena pakai admin client)?
