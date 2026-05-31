
## Tujuan

Memperbaiki 4 hal pada halaman cetak `src/routes/print.laporan.$id.tsx` agar hasil cetak A4 rapi sesuai template.

## Perubahan

### 1. C. OUTPUT & D. TINDAK LANJUT sejajar + titik dua kembali

Saat ini keduanya dirender 2 baris: judul (`lpd-group`) di baris 1, value di baris 2 dengan `no`/`label` kosong — sehingga value terlihat melayang dan titik dua hilang (kode: `{label ? ":" : ""}`).

Akan diubah jadi satu baris grid yang menyatu dengan kolom value lain:
- Kolom 1+2 (gabung) berisi label tebal `C. OUTPUT` / `D. TINDAK LANJUT`
- Kolom 3 berisi `:`
- Kolom 4 berisi nilai (`lpd.output`, `lpd.tindak_lanjut`)

Implementasi: buat komponen kecil `GroupInlineRow` yang reuse `.lpd-row` tapi dengan `grid-template-columns` yang menggabungkan dua kolom pertama (`192px 10px 1fr`) — sehingga titik dua dan value-nya tetap segaris persis dengan baris di atasnya (`2 orang`, `BOK`, dst).

### 2. Tanggal Pelaksanaan — tampilkan rentang penuh & kurangi lebar label

- Buat helper baru `formatDateRangeFull(start, end)` di `src/lib/format.ts` yang **selalu** mengembalikan `"<start> s/d <end>"` walau tanggalnya sama (mis. `25 Mei 2026 s/d 25 Mei 2026`). `formatDateRange` lama tetap dipertahankan untuk tempat lain.
- Pakai helper baru di baris Tanggal Pelaksanaan.
- Kecilkan `.lpd-table td.label` dari `160px` → `130px` agar kolom value lebih lega dan judul "Tanggal Pelaksanaan" tidak makan ruang berlebihan.

### 3. Saran ukuran font untuk A4

Rekomendasi saya: turunkan body dari **11pt → 10pt**, dan judul `<h1>` dari **14pt → 13pt**. Alasan:
- 10pt adalah ukuran standar dokumen dinas Indonesia (mirip Arial 10/11 pada Word) dan masih sangat nyaman dibaca.
- Memberi ruang lebih supaya isi tabel Hasil Kegiatan (yang panjang) tidak mepet ke pinggir A4.
- Foto dokumentasi jadi punya ruang lebih besar tanpa memecah halaman.

Line-height tetap 1.3 agar tetap legible.

## File yang Diubah

- `src/lib/format.ts` — tambah `formatDateRangeFull`
- `src/routes/print.laporan.$id.tsx` — ganti render OUTPUT/TINDAK LANJUT, pakai helper baru, kecilkan font & lebar label

## Tidak Diubah

- Logika data, RPC, status approval — tidak disentuh
- Halaman cetak SPPD (`print.lpd.$id.tsx`) — di luar scope koreksi ini
