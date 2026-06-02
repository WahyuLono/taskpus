## Perbaikan Cetak SPT — `src/routes/print.lpd.$id.tsx`

Tiga perbaikan pada satu file. Tidak ada perubahan backend.

### 1. Ukuran font isi surat: 11pt → 10pt
Pada blok `<style>` ubah `.spt-page { font-size: 11pt }` menjadi `10pt`. Kop surat & judul tetap (mereka pakai ukuran inline sendiri: 14/13/16pt + 10pt alamat, judul 13pt) — hanya body teks ikut turun ke 10pt.

### 2. Page break strategy untuk blok tanda tangan & petugas

Tambahkan aturan CSS print:

```css
@media print {
  .spt-page table, .spt-page ol, .spt-page li { page-break-inside: avoid; }
  .spt-petugas-item { page-break-inside: avoid; break-inside: avoid; }
  .spt-signature-block { page-break-inside: avoid; break-inside: avoid; page-break-before: auto; }
  .spt-signature-block { orphans: 4; widows: 4; }
}
```

Lalu di JSX:
- Bungkus tiap item petugas (`<table key={p.id_user}>`) dengan className `spt-petugas-item` agar satu petugas tidak terbelah dua halaman.
- Gabungkan blok "Dikeluarkan" + blok dua kolom TTD ke dalam satu wrapper `<div className="spt-signature-block">` sehingga *seluruh* footer tanda tangan (Mengetahui + Kepala UPTD + tanggal) dijaga selalu dalam satu halaman. Jika tidak muat, browser akan memindahkan seluruh blok ke halaman berikutnya — tidak akan ada bagian TTD yang terpotong.

Tidak dipakai `page-break-before: always` karena akan memaksa halaman baru meski masih cukup ruang (boros kertas). `page-break-inside: avoid` di wrapper sudah cukup untuk skenario >2 petugas yang Anda khawatirkan.

### 3. Hilangkan kemungkinan double margin

Saat ini:
- `@page { margin: 1.4cm 2cm 1.4cm 2.5cm }` ← margin fisik printer.
- `.spt-page { padding: 1cm 2cm; max-width: 21cm; margin: 0 auto }` ← padding tambahan untuk preview di layar.

Saat dicetak, kedua-duanya berlaku → total margin kiri ≈ 2.5cm + 2cm = 4.5cm (terlalu jauh). Perbaikan:

- Pindahkan padding `1cm 2cm` agar **hanya aktif di layar**:
  ```css
  .spt-page { padding: 0; }
  @media screen { .spt-page { padding: 1cm 2cm; } }
  @media print { .spt-page { max-width: none; margin: 0; padding: 0; } }
  ```
- Dengan begitu, saat dicetak hanya `@page` margin yang berlaku (konsisten antara preview & hasil cetak). Saat dilihat di browser, tetap ada padding agar tampak seperti dokumen.

### Yang TIDAK diubah
- Konten surat, logo, kop, data petugas/kepala, logika fetch & auth.
- File lain (`print.laporan.$id.tsx` tidak disebut user → tidak disentuh).
