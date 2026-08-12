# Rollback Persetujuan 7 LPD

## Kesimpulan evaluasi

Ini bukan penambahan fitur, hanya koreksi data. Cara paling aman **bukan** menghapus data atau nomor surat (itu akan merusak urutan jatah nomor), melainkan mengembalikan status persetujuan lewat mekanisme yang sudah ada di sistem: status **Ditolak + catatan**.

Setelah dirollback, petugas otomatis bisa mengedit laporan, mengunggah ulang foto, lalu mengajukan persetujuan kembali. Nomor surat, tanggal, dan penugasan tetap utuh.

## Cakupan

Yang dirollback (status saat ini "Disetujui"):
090/2139, 2140, 2141, 2142, 2143, 2144, 2151 (P.KI.2026)

Tidak disentuh (masih "Menunggu", belum disetujui):
090/2146, 2148, 2149, 2150

## Yang akan terjadi pada 7 LPD tersebut

- Status persetujuan: Disetujui -> **Ditolak**
- Status surat: Sudah -> **Belum**
- Data penyetuju (siapa & kapan) dikosongkan
- Catatan penolakan diisi:
  "Mohon upload ulang foto penugasan anda, beserta watermark yang sesuai dengan tanggal, dan tempat penugasan secara real time penugasan."
- Setiap petugas yang ditugaskan pada LPD tersebut menerima **notifikasi penolakan** berisi catatan di atas
- Isi laporan dan foto lama **tetap disimpan** (tidak dihapus), supaya petugas tinggal mengganti fotonya

## Catatan teknis

Perubahan dilakukan sebagai operasi data (bukan migrasi skema): satu UPDATE pada `transaksi_lpd` untuk 7 nomor surat tersebut (`approval_status='Ditolak'`, `status_lpd='Belum'`, `approved_by`/`approved_at` = NULL, `catatan_reject` diisi, `updated_at=now()`), diikuti INSERT ke `notifikasi` bertipe `lpd_rejected` untuk setiap petugas pada `detail_petugas`. Meniru persis perilaku fungsi `reject_lpd` yang sudah ada, tanpa mengubah kode aplikasi maupun struktur database.
