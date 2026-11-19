# Pencegahan Bentrok Jadwal Petugas pada SPT

## Tujuan
Mencegah seorang petugas ditugaskan pada lebih dari satu SPT dengan tanggal kegiatan yang saling bertumpang tindih, baik saat membuat maupun mengedit SPT.

## Perilaku yang dibangun
- Admin mendapat peringatan langsung saat memilih petugas yang sudah ditugaskan pada rentang tanggal tersebut; informasi mencantumkan nomor surat dan tanggal yang bentrok.
- SPT yang berstatus Batal tidak dihitung sebagai bentrok. Tanggal yang beririsan dihitung bentrok, termasuk tanggal mulai/selesai yang sama.
- Perubahan tanggal atau daftar petugas saat mengedit SPT juga diperiksa, tanpa menganggap SPT yang sedang diedit sebagai bentrok dengan dirinya sendiri.
- Tombol simpan tidak meneruskan pilihan yang bentrok, dan pencegahan tetap diberlakukan saat penyimpanan agar dua pembuatan bersamaan tidak bisa lolos.
- SPT lama tidak diubah atau dihapus otomatis. Bentrok yang sudah ada tetap tercatat; aturan hanya mencegah bentrok baru.

## Pendekatan teknis
- Tambahkan pemeriksaan bentrok terpusat di fungsi database yang menangani pembuatan dan pembaruan SPT, dengan kunci transaksi per petugas untuk menjaga pemeriksaan tetap aman saat beberapa admin menyimpan bersamaan.
- Sediakan pembacaan jadwal yang relevan untuk form Admin, lalu tampilkan penanda bentrok pada pilihan petugas di halaman buat dan edit.
- Periksa kembali aturan di kedua halaman dan fungsi database, serta jalankan pengujian terhadap jadwal sama hari, rentang tanggal tumpang tindih, jadwal terpisah, SPT Batal, dan pengecualian SPT yang sedang diedit.

## Di luar cakupan
Tidak membersihkan atau mengubah penugasan yang sudah tumpang tindih. Tidak membatasi satu petugas hanya boleh memiliki satu SPT per hari jika rentang tanggalnya tidak beririsan.
