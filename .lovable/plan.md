## Terapkan perbaikan cetak yang sama ke Cetak LPD — `src/routes/print.laporan.$id.tsx`

Konsisten dengan perbaikan SPT sebelumnya. Hanya satu file yang disentuh.

### 1. Font isi surat sudah 10pt
File ini sudah `font-size: 10pt` — tidak perlu diubah.

### 2. Page break: hindari blok ttd petugas terpotong
Tambah aturan print:
```css
@media print {
  .lpd-page table, .lpd-page tr, .lpd-page td { page-break-inside: avoid; }
  .ttd-block { page-break-inside: avoid; break-inside: avoid; orphans: 4; widows: 4; }
}
```
`.ttd-block` sudah membungkus tiap petugas (nama + NIP + garis ttd), jadi cukup tambah CSS — tidak perlu ubah JSX. Skenario yang dikhawatirkan (kotak ttd ke-2 terpotong antara dua halaman seperti pada lampiran) akan teratasi: jika blok tidak muat di sisa halaman, browser memindahkan seluruh blok ke halaman berikutnya.

Tambahan: bungkus heading "Yang Melaksanakan Perjalanan Dinas:" + minimal blok ttd pertama agar judul tidak yatim di akhir halaman:
- Ubah `<p>Yang Melaksanakan…</p>` jadi memiliki class `keep-with-next` dengan CSS `page-break-after: avoid; break-after: avoid;`.

### 3. Hilangkan kemungkinan double margin
Saat ini:
- `@page { margin: 1.4cm 1.8cm }`
- `.lpd-page { padding: 1cm 1.8cm; max-width: 21cm; margin: 0 auto }`

Saat cetak → total margin kiri ≈ 1.8 + 1.8 = 3.6cm.

Perbaikan (pola sama seperti SPT):
```css
.lpd-page { padding: 0; }
@media screen { .lpd-page { padding: 1cm 1.8cm; } }
@media print  { .lpd-page { max-width: none; margin: 0; padding: 0; } }
```
Hasil: di layar tetap terlihat seperti dokumen berpadding, di cetak hanya `@page` margin yang aktif sehingga preview vs hasil printer konsisten.

### Yang TIDAK diubah
- Logika fetch, signed URL foto, auto-print, guard akses petugas/approval.
- Struktur tabel, isi laporan, format tanggal/NIP.
- File lain (`print.lpd.$id.tsx` sudah diperbaiki sebelumnya, tidak disentuh).
