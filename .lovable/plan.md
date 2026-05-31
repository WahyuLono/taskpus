## Ubah UI Petugas Ditugaskan di /lpd/baru

Saat ini section "Petugas Ditugaskan" menampilkan daftar semua pegawai sekaligus. Akan diubah menjadi pola search-then-pick.

### Perubahan UI (hanya frontend, file: `src/routes/_authenticated/lpd.baru.tsx`)

1. **Chip petugas terpilih** di atas input pencarian
   - Menampilkan nama tiap petugas yang sudah dicentang sebagai chip dengan tombol ✕ untuk menghapus.
   - Jika belum ada yang dipilih, tampilkan teks samar "Belum ada petugas dipilih".

2. **Input pencarian** (tetap seperti sekarang, placeholder "Cari nama atau NIP…").

3. **Daftar hasil pencarian** hanya muncul ketika `petugasSearch.trim().length > 0`.
   - Filter dari `petugas.data` berdasarkan nama / NIP / username (logic sama).
   - Petugas yang sudah dipilih **tidak** muncul lagi di hasil (sudah ada di chip di atas).
   - Tampilan baris tetap sama: nama, NIP • jabatan, badge status_kepegawaian, checkbox di kiri.
   - Saat checkbox dicentang → tambahkan ke `petugasIds` lalu **reset `petugasSearch` ke ""** sehingga daftar tertutup dan user bisa mengetik pencarian berikutnya.
   - Jika tidak ada hasil cocok → tampilkan "Tidak ada pegawai cocok."

4. **Tanpa pencarian** → tidak ada daftar pegawai sama sekali, hanya chip + input + hint kecil "Ketik nama atau NIP untuk mencari petugas."

### Yang tidak berubah
- Server function `listPetugas`, validasi submit, ringkasan, dan jumlah `petugasIds`.
- Tidak ada perubahan database / backend / RPC.
