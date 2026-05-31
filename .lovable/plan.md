## Samakan UI Petugas Ditugaskan di Edit SPT

Saat ini `src/routes/_authenticated/lpd.$id_.edit.tsx` masih menampilkan daftar semua pegawai pada section "Petugas Ditugaskan". Terapkan pola search-then-pick yang sama dengan halaman Buat SPT.

### Perubahan (frontend only, satu file: `src/routes/_authenticated/lpd.$id_.edit.tsx`)

1. Ganti `filteredPetugas` (useMemo) menjadi:
   - `petugasAll`, `selectedPetugas` (yang sudah dipilih), dan `filteredPetugas` yang hanya berisi hasil pencarian saat `petugasSearch.trim()` terisi, dan **mengecualikan** petugas yang sudah dipilih.

2. Render section "Petugas Ditugaskan":
   - Chip petugas terpilih di atas (nama + tombol ✕ untuk hapus).
   - Jika belum ada, tampilkan "Belum ada petugas dipilih."
   - Input pencarian (placeholder "Cari nama atau NIP…").
   - Daftar hasil hanya muncul saat ada teks pencarian; baris pakai layout sama (checkbox, nama, NIP • jabatan, badge status_kepegawaian).
   - Saat dicentang → `togglePetugas` lalu `setPetugasSearch("")` agar daftar tertutup.
   - Jika kosong → "Tidak ada pegawai cocok."
   - Tanpa pencarian → hint kecil "Ketik nama atau NIP untuk mencari petugas."

### Yang tidak berubah
- Inisialisasi `petugasIds` dari `assigned` (petugas existing tetap auto-terpilih dan muncul sebagai chip).
- Server functions, validasi, submit, ringkasan.
