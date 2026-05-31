# Perbaiki status_lpd saat petugas simpan laporan

## Masalah
Di `src/lib/lpd.functions.ts` (fungsi `submitLaporan`, baris ~137–151), saat petugas menekan **Simpan**, kolom `status_lpd` langsung di-set ke `"Sudah"`. Akibatnya status di backend / tabel daftar LPD langsung jadi **Selesai**, padahal admin belum approve. Hal yang sama terulang ketika petugas mengirim ulang setelah ditolak.

Seharusnya `status_lpd` baru berubah jadi `"Sudah"` ketika admin menekan **Setujui** — dan RPC `approve_lpd` sudah melakukan itu. Begitu pula `reject_lpd` sudah memastikan kembali ke `"Belum"` saat ditolak.

## Perubahan
**File:** `src/lib/lpd.functions.ts` — fungsi `submitLaporan`

- Hapus baris `status_lpd: "Sudah"` dari payload `.update(...)`. Cukup update field laporan (input_alat, metode, lama_kegiatan, sasaran, hambatan, output, tindak_lanjut, url_foto, updated_at).
- Tetap panggil RPC `submit_laporan_for_approval` setelahnya — itu yang mengubah `approval_status` jadi `"Menunggu"`.

## Hasil yang diharapkan
- Petugas simpan pertama kali → `approval_status = Menunggu`, `status_lpd = Belum` → badge tetap **Menunggu**.
- Admin tolak → tetap `Belum`, petugas bisa revisi.
- Petugas simpan revisi → tetap `Menunggu` + `Belum`.
- Admin setujui → `approval_status = Disetujui`, `status_lpd = Sudah` → badge berubah **Selesai**, tombol Cetak LPD muncul.

Tidak ada perubahan database / RLS / UI; murni satu baris di server function.