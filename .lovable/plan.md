# Rencana reset fresh LPD 00002 dan 00003

## Evaluasi
Saya sudah cek kondisi aktual, dan untuk **00002** serta **00003** saat ini datanya memang masih terisi penuh dan statusnya sudah final:

- **090/00002/P.KI.2026**
  - status_lpd: **Sudah**
  - approval_status: **Disetujui**
  - url_foto: `2026/05/090_00002_P.KI.2026/foto-1780233912818.jpg`
- **090/00003/P.KI.2026**
  - status_lpd: **Sudah**
  - approval_status: **Disetujui**
  - url_foto: `2026/05/090_00003_P.KI.2026/foto-1780188840312.png`

Saya juga cek bucket `laporan_lpd`, dan **file foto untuk kedua nomor itu memang masih ada** dengan path yang sama seperti di `url_foto`.

Jadi evaluasi saya:
- **Masalahnya bukan mismatch aktif antara `url_foto` dan bucket** untuk 00002/00003, karena saat ini keduanya masih sinkron.
- Kalau tujuan Anda adalah **mulai ulang dari nol (fresh)** setelah perubahan digit nomor surat, maka langkah paling aman adalah **reset data LPD 00002 dan 00003 saja**, bukan ubah logika aplikasi.

## Yang akan saya lakukan
1. **Hapus file foto untuk 00002 dan 00003 dari bucket `laporan_lpd`**
2. **Kosongkan data hasil kegiatan** pada 2 baris `transaksi_lpd` tersebut:
   - `input_alat`
   - `input_metode`
   - `input_lama_kegiatan`
   - `proses_sasaran`
   - `proses_hambatan`
   - `output`
   - `tindak_lanjut`
   - `url_foto`
   - `catatan_reject`
3. **Reset status workflow** agar benar-benar kembali ke awal:
   - `status_lpd` → `Belum`
   - `approval_status` → `Draft`
   - `approved_by` → `NULL`
   - `approved_at` → `NULL`
4. **Pertahankan data inti LPD** supaya nomor surat dan penugasan tidak berubah:
   - `no_surat`
   - `no_surat_slug`
   - tanggal-tanggal
   - `jenis_perjadin`
   - `id_rangka`
   - `id_tempat`
   - `id_kepala`
   - `detail_petugas`
5. **Verifikasi hasil reset**
   - `url_foto` sudah `NULL`
   - field hasil kegiatan kosong
   - status kembali `Belum` / `Draft`
   - objek foto untuk 00002 dan 00003 sudah tidak ada lagi di bucket

## Detail teknis
- Ini **perubahan data saja**, bukan perubahan struktur database.
- Saya akan menargetkan **2 LPD spesifik**: `090/00002/P.KI.2026` dan `090/00003/P.KI.2026`.
- Tidak ada perubahan pada format nomor surat 5 digit yang sudah benar sekarang.
- Tidak ada perubahan kode kecuali nanti ternyata saat validasi ditemukan bug tambahan yang benar-benar perlu diperbaiki.

## Hasil yang diharapkan
Setelah dijalankan, kedua LPD itu akan kembali seperti **belum pernah mengunggah laporan/foto**, sehingga proses input bisa dimulai ulang dari kondisi bersih.