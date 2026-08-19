# Upload 2 Foto Dokumentasi pada Laporan LPD

## Kondisi saat ini (terverifikasi)
- Upload foto hanya **1 file**: `transaksi_lpd.url_foto` bertipe teks tunggal, form di halaman detail LPD hanya menyimpan satu `File`.
- Kompresi otomatis: target **≤ 250 KB** (`maxSizeMB: 0.25`), maksimal sisi 1920px, kualitas awal 0.8, output dikonversi ke JPG. Input maksimal 5 MB, HEIC ditolak.

## Tujuan
Petugas bisa mengunggah **1 sampai 2 foto** dokumentasi (foto ke-2 opsional), dengan tampilan lampiran gaya shadcn Attachment.

## Yang akan dibangun

### 1. Database
- Tambah kolom `url_foto_2 text` (nullable) pada `transaksi_lpd`. Data lama tetap aman karena `url_foto` tidak diubah.

### 2. Server function
- `submitLaporan`: tambah field opsional `url_foto_2` pada skema validasi dan simpan ke kolom baru.
- Aturan tetap: minimal `url_foto` wajib terisi.

### 3. Komponen UI baru
- Tambah `src/components/ui/attachment.tsx` (komponen shadcn Attachment: `Attachment`, `AttachmentGroup`, `AttachmentMedia`, `AttachmentContent`, `AttachmentTitle`, `AttachmentDescription`, `AttachmentActions`, `AttachmentAction`) memakai token desain proyek — tanpa warna hardcoded.

### 4. Halaman detail LPD (form laporan)
- State foto menjadi array (maks 2 slot), tiap file tetap melewati kompresi 250 KB yang sudah ada.
- Dropzone tetap ada tetapi:
  - menerima multi-file sekaligus (drop 2 file langsung terisi keduanya),
  - otomatis tersembunyi/nonaktif saat sudah 2 foto, dengan keterangan "Maksimal 2 foto".
- Foto terpilih ditampilkan sebagai `AttachmentGroup` berisi kartu lampiran: thumbnail, nama file, ukuran (mis. "JPG · 180 KB"), dan tombol hapus (ikon `X`) per foto.
- Validasi kirim: minimal 1 foto (perilaku sekarang dipertahankan).
- Saat revisi, foto lama (1 atau 2) dimuat sebagai lampiran yang sudah ada dan bisa dihapus/diganti satu per satu.

### 5. Tampilan baca (Laporan Readonly)
- Bagian "Dokumentasi" menampilkan hingga 2 foto dalam grid 2 kolom, masing-masing dapat diklik untuk membuka versi penuh.

### 6. Halaman cetak laporan
- Menampilkan kedua foto **berdampingan (2 kolom)**; jika hanya 1 foto, tampil seperti sekarang.
- Auto-print menunggu kedua signed URL siap, dan blok foto diberi `page-break-inside: avoid`.

## Catatan teknis
- Penyimpanan tetap di bucket `laporan_lpd` dengan pola path `YYYY/MM/<slug>/foto-<timestamp>.jpg`; foto kedua memakai timestamp berbeda sehingga tidak saling menimpa.
- Menghapus lampiran di form hanya melepas referensi pada saat kirim; file lama di storage tidak dihapus otomatis (sesuai perilaku sekarang).
- Tidak ada perubahan pada alur persetujuan, notifikasi, maupun penomoran surat.
