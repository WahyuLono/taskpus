## Akar masalah

RLS pada tabel `master_user` saat ini hanya mengizinkan:

- Admin: baca semua baris
- User biasa: baca **baris dirinya sendiri saja** (`auth.uid() = id_user`)

Akibatnya, ketika petugas membuka detail LPD:

- Embed `kepala:id_kepala(...)` → kosong (baris kepala UPTD tidak boleh dibaca) → muncul `—`
- Embed daftar petugas → hanya baris dirinya sendiri yang lolos RLS, sehingga rekan satu tugas juga tidak tampil (lihat gambar 2: hanya 1 dari 2 petugas yang muncul)

Jadi ini bukan bug query — query sudah benar; yang kurang adalah policy RLS.

## Rekomendasi (Opsi A — sederhana, aman untuk app internal)

Tambah satu policy SELECT di `master_user`:

> Setiap user terautentikasi boleh membaca baris `master_user` lain.

Alasan boleh: ini aplikasi internal staf UPTD. Kolom yang ditampilkan UI (nama, NIP, jabatan, unit, golongan, status kepegawaian, is_kepala_uptd) memang dimaksudkan untuk dilihat antar-staf. Kolom `username`, `email_internal`, `role_user` tidak dipakai di UI petugas, tetapi secara teknis akan ikut bisa dibaca jika ada yang query langsung. Untuk staf internal hal ini umumnya dapat diterima.

### Migrasi yang akan dijalankan

```sql
CREATE POLICY "Authenticated can read master_user"
ON public.master_user
FOR SELECT
TO authenticated
USING (true);
```

Policy lama "Users read own row" tetap dipertahankan (redundan tapi tidak mengganggu) — atau bisa dihapus. Saya akan **menghapusnya** agar bersih.

## Alternatif (Opsi B — lebih ketat)

Hanya izinkan petugas membaca:

- Baris kepala UPTD (`is_kepala_uptd = true`), DAN
- Baris user yang menjadi petugas pada LPD yang juga diakses oleh requester (lewat `detail_petugas` + `is_assigned_to_lpd`).

Lebih aman tapi policy-nya kompleks dan butuh fungsi pembantu tambahan. Cocok jika `email_internal`/`username`/`role_user` dianggap rahasia.

## Yang akan saya kerjakan setelah persetujuan

1. Migrasi RLS:
  - Drop policy `Users read own row`.
  - Tambah policy `Authenticated can read master_user` (Opsi A, default) — *atau Opsi B jika Anda pilih*.
2. Tidak ada perubahan kode frontend / server function — query sudah benar.

Mohon konfirmasi: **Opsi A** atau **Opsi B**? Opsi B