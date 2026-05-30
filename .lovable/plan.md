## Perubahan di `src/routes/_authenticated/lpd.$id.tsx`

1. **Ubah label tombol cetak** (baris 84)
   - Dari: `Cetak Surat Tugas (SPT)`
   - Menjadi: `Cetak Surat Tugas (ST)`

2. **Batasi akses tombol cetak hanya untuk Admin**
   - Gunakan hook `useCurrentUser` (sudah di-import di file ini).
   - Ambil `data: me` dan cek `me?.role_user === "Admin"`.
   - Render elemen `<a href="/print/lpd/...">` hanya jika user adalah Admin. Untuk role Petugas, tombol tidak ditampilkan sama sekali.

3. **Proteksi route cetak (`/print/lpd/$id`)**
   - Tambahkan guard pada `src/routes/print.lpd.$id.tsx` agar jika user non-Admin membuka URL langsung, halaman menampilkan pesan "Akses ditolak — hanya Admin yang dapat mencetak Surat Tugas" alih-alih merender surat. Ini mencegah Petugas bypass via URL.

Tidak ada perubahan pada layout, data fetching, atau text lain (mis. paragraf "Surat Perintah Tugas (SPT)" di template surat tetap, karena user hanya meminta perubahan pada tombol cetak).
