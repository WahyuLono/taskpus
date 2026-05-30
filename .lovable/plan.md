## Konteks

Saat ini di `src/routes/_authenticated/lpd.$id.tsx` (komponen `LaporanForm` & `LaporanReadonly`), Laporan Hasil Pelaksanaan Tugas hanya punya **satu** field bebas: `hasil_kegiatan` (textarea, min 150 karakter). Sesuai lampiran, ini perlu diubah menjadi **form terstruktur** dengan beberapa sub‑field. Foto dokumentasi **tidak diubah**.

Plan ini **hanya menyentuh frontend** (`lpd.$id.tsx`). Backend (kolom tabel `transaksi_lpd`, server function `submitLaporan`, types) **belum** disentuh — masih disimpan ke `hasil_kegiatan` lama sebagai satu string JSON / gabungan teks sementara, supaya bisa Anda review tampilan dulu.

## Struktur Field Baru

Sesuai lampiran, ada 4 bagian:

**A. Input**

1. Pelaksana Kegiatan — auto, jumlah petugas (angka) + " Orang", **read‑only / locked**
2. Sumber Dana — hard‑coded **"BOK"**, **read‑only / locked**
3. Alat yang Digunakan — input petugas (textarea pendek)
4. Metode — input petugas (textarea pendek)
5. Lama Kegiatan — input petugas (textarea pendek)

**B. Proses**

1. Sasaran — input petugas (textarea pendek)
2. Jadwal — auto dari `tgl_kegiatan` (format tanggal Indonesia), **read‑only / locked**
3. Tempat Pelaksanaan — auto dari `master_tempat.nama_tempat`, **read‑only / locked**
4. Hambatan — input petugas (textarea pendek)

**C. Output** — input petugas (textarea)

**D. Tindak Lanjut** — input petugas (textarea)

Field yang bisa diedit petugas: `alat`, `metode`, `lama_kegiatan`, `sasaran`, `hambatan`, `output`, `tindak_lanjut` (7 field).

## Perubahan Frontend

### 1. `LaporanForm` (state & UI)

- Hapus single state `hasil` (textarea besar + counter 150).
- Ganti dengan satu object state:
  ```ts
  const [form, setForm] = useState({
    alat: "", metode: "", lama_kegiatan: "",
    sasaran: "", hambatan: "",
    output: "", tindak_lanjut: "",
  });
  ```
- Render 3 grup section bertingkat: **A. Input**, **B. Proses**, **C. Output**, **D. Tindak Lanjut** dengan heading + list bernomor sesuai lampiran.
- Field auto/locked ditampilkan sebagai baris read-only bergaya `bg-surface-container-low` + ikon `lock`, **tidak** ikut state.
  - Pelaksana Kegiatan = `${petugas.length} Orang` (perlu pass `petugas` dari parent ke `LaporanSection` → `LaporanForm`).
  - Sumber Dana = "BOK".
  - Jadwal = `formatDateRange(lpd.tgl_kegiatan, lpd.tgl_selesai)` (atau `formatDate(lpd.tgl_kegiatan)` saja — konfirmasi di bawah).
  - Tempat Pelaksanaan = `lpd.master_tempat?.nama_tempat`.
- Validasi `canSubmit`: ke‑7 field editable harus terisi (trim length ≥ 1) **dan** `file` terpilih. (Konfirmasi di bawah soal min‑karakter.)
- Tombol "Simpan & Tandai Selesai" tetap; teks deskripsi diubah jadi "Lengkapi seluruh isian laporan dan unggah satu foto dokumentasi…".

### 2. Penyimpanan sementara (tanpa migrasi)

Karena backend belum diubah, dalam `mut.mutationFn` kita gabungkan 7 field + 2 auto + 2 hardcode menjadi satu string terstruktur (format `Label: value` per baris atau JSON `JSON.stringify(form)`) dan kirim sebagai `hasil_kegiatan` lama. Ini hanya **placeholder** supaya simpan tetap jalan dan kelihatan di mode readonly. Setelah Anda approve UI, plan terpisah akan migrasikan skema DB & server fn ke kolom per field.

### 3. `LaporanReadonly`

- Render bagian baca-saja dengan struktur yang sama (A/B/C/D). Sementara nilai dipecah kembali dari string `lpd.hasil_kegiatan` (best‑effort parse JSON, fallback tampilkan apa adanya untuk LPD lama).
- Foto dokumentasi tetap.

### 4. Halaman lain

- `print.lpd.$id.tsx` saat ini tidak memakai `hasil_kegiatan` → tidak perlu diubah di plan ini.
- `lpd.index.tsx`, dashboard, dll. tidak menampilkan isi laporan → tidak terdampak.

## Skup yang TIDAK Termasuk (akan diplan terpisah)

- Perubahan tabel `transaksi_lpd` (drop `hasil_kegiatan`, tambah 7 kolom baru).
- Perubahan `submitLaporan` server function & `getLpdDetail` mapper.
- Update `src/integrations/supabase/types.ts`.
- Tampilan di halaman cetak (kalau nanti ingin ditampilkan).

## Pertanyaan Konfirmasi

1. **Min/max karakter per field editable**: tetap minimal? Saya usulkan **tanpa min 150** lagi — cukup wajib isi (≥ 1 karakter) per field, max ~500/field. OK? OK
2. **Jadwal locked**: tampilkan satu tanggal (`tgl_kegiatan`) atau range `tgl_kegiatan → tgl_selesai`? tgl_kegiatan saja
3. **Pelaksana Kegiatan locked**: tampilkan "3 Orang" saja, atau "3 Orang (Nama A, Nama B, Nama C)"? tidak perlu nama orangnya.

Silakan jawab — atau saya pakai default (min 1 char, range tanggal, hanya angka + "Orang") kalau Anda langsung approve.