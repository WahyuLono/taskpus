# Rebrand: Logo + Teks "UPTD Puskesmas Kumai"

## Aset Logo
- Copy `user-uploads://LOGO_2-removebg-preview.png` → `src/assets/logo-puskesmas.png`.
- Import sebagai ES module di komponen yang memakainya (login + sidebar).

## Perubahan Teks & Logo

### 1. Halaman Login — `src/routes/login.tsx`
- Ganti ikon `material-symbols-outlined "apartment"` (di dalam kotak biru bulat) dengan `<img src={logo} alt="UPTD Puskesmas Kumai" />`.
- Hapus background biru bulat karena logo sudah punya identitas warna sendiri; cukup tampilkan logo ±80–96px di tengah.
- Judul `TASKPUS` tetap.
- Subjudul: `Manajemen Laporan Perjalanan Dinas` → `UPTD Puskesmas Kumai`.

### 2. Sidebar (admin & petugas) — `src/routes/_authenticated.tsx`
- Ganti ikon `apartment` di header sidebar dengan `<img>` logo Puskesmas (tetap ukuran kotak ±32–36px, tanpa background biru).
- Baris judul `TASKPUS` tetap.
- Baris kedua: `Manajemen LPD` → `UPTD Puskesmas Kumai`.
- Sidebar dipakai bersama untuk role admin & petugas (file ini adalah layout `_authenticated`), jadi otomatis konsisten di kedua role.

## Yang TIDAK diubah
- Metadata `__root.tsx` (title/description SEO "TASKPUS …") — di luar permintaan user.
- Logika auth, routing, dan komponen lain.

## Catatan teknis
- File logo masuk ke `src/assets/` agar di-bundle Vite, bukan `public/`.
- Tidak perlu migrasi DB atau perubahan backend.
