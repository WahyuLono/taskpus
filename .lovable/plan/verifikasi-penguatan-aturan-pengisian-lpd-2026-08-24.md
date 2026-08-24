# Verifikasi & Penguatan Aturan Pengisian LPD

## Hasil verifikasi (kondisi saat ini)

**1. Hanya petugas yang ditugaskan boleh mengisi & mengirim LPD — BELUM berlaku.**

- Di halaman detail LPD, form laporan ditampilkan berdasarkan status (Draft/Ditolak) saja, tanpa memeriksa apakah pengguna termasuk petugas yang ditugaskan. Admin ikut melihat form yang bisa diisi dan dikirim.
- Di database, kebijakan akses "Admin update lpd" mengizinkan Admin mengubah isi laporan, dan fungsi pengiriman untuk persetujuan (`submit_laporan_for_approval`) secara eksplisit menerima Admin **atau** petugas yang ditugaskan.
- Fungsi server `submitLaporan` juga tidak memeriksa penugasan.
- Yang sudah benar: petugas yang tidak ditugaskan sama sekali tidak bisa melihat/mengubah LPD (kebijakan baca & ubah memakai pemeriksaan penugasan).

**2. LPD hanya boleh diisi mulai tanggal kegiatan — BELUM berlaku.**

- Tidak ada pemeriksaan tanggal di mana pun: tidak di form, tidak di fungsi server, tidak di database. Petugas bisa mengisi dan mengirim kapan saja, termasuk sebelum tanggal kegiatan.

## Rencana perbaikan

### Aturan A — pengisian & pengiriman hanya oleh petugas yang ditugaskan

- Halaman detail LPD: form laporan hanya tampil untuk petugas yang ditugaskan. Admin melihat versi baca-saja (plus panel review/persetujuan yang sudah ada).
- Fungsi server `submitLaporan`: tolak jika pemanggil bukan petugas yang ditugaskan pada LPD tersebut.
- Database: hapus izin Admin untuk mengubah kolom isi laporan (Admin tetap bisa mengubah data SPT lewat fungsi `update_lpd_spt`, membatalkan, menyetujui, dan menolak), dan hilangkan jalur Admin pada `submit_laporan_for_approval` sehingga hanya petugas yang ditugaskan bisa mengirim untuk persetujuan.

### Aturan B — tidak boleh mengisi sebelum tanggal kegiatan

- Database (`submit_laporan_for_approval`): tolak pengiriman bila tanggal hari ini masih sebelum tanggal kegiatan.
- Fungsi server `submitLaporan`: validasi yang sama, dengan pesan berbahasa Indonesia yang jelas.
- UI: sebelum tanggal kegiatan, form ditampilkan terkunci dengan keterangan "Pengisian LPD dibuka mulai &nbsp;". Tombol simpan & kirim dinonaktifkan.

Catatan: acuan tanggal memakai waktu Asia/Jakarta agar tidak bergeser sehari.

## Yang perlu Anda putuskan

- Untuk Aturan B: pengisian dibuka mulai **tanggal kegiatan (tanggal mulai)** — ini yang diasumsikan rencana ini. Bila seharusnya baru dibuka setelah kegiatan selesai (`tgl_selesai`), sebutkan dan akan disesuaikan. revisi : tanggal kegiatan selesai.
- Untuk Aturan A: bila Admin sesekali perlu mengisi mewakili petugas (mis. petugas kesulitan akses), beri tahu — jika tidak, akses isi laporan untuk Admin dicabut sepenuhnya.

## Catatan teknis

- File terdampak: `src/routes/_authenticated/lpd.$id.tsx`, `src/lib/lpd.functions.ts`.
- Perubahan database: kebijakan UPDATE pada `transaksi_lpd` dan fungsi `submit_laporan_for_approval` (lewat migrasi, perlu persetujuan Anda).