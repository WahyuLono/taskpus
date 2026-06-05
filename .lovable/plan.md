## Masalah
Pada cetak LPD, ketika daftar petugas terpotong ke halaman ke-2, petugas pertama di halaman baru (mis. nomor 3) menempel terlalu dekat dengan margin atas — terasa sempit karena `.ttd-block` hanya punya `margin-bottom: 56px` (jarak ke bawah), tidak ada padding/margin atas, jadi browser meletakkannya persis di batas margin atas halaman baru.

## Solusi
Beri ruang vertikal **di atas** tiap blok petugas, bukan hanya di bawah, supaya:
- Antar petugas di halaman yang sama: jarak tetap nyaman (tidak dobel jadi terlalu jauh).
- Petugas pertama di halaman baru setelah page-break: punya "napas" di atas garis ttd.

## Perubahan
File: `src/routes/print.laporan.$id.tsx` — hanya CSS `.ttd-block`.

Sebelum:
```css
.ttd-block {
  ...
  margin-bottom: 56px;
}
```

Sesudah:
```css
.ttd-block {
  ...
  padding-top: 24px;     /* ruang atas — terlihat juga setelah page-break */
  margin-bottom: 32px;   /* dikurangi agar total jarak antar petugas ±56px tetap */
}
```

Catatan teknis:
- `padding-top` (bukan `margin-top`) penting karena `margin-top` sering dibuang browser di awal halaman baru setelah page-break; `padding` tetap dirender.
- Total jarak antar petugas pada halaman yang sama: `32px (margin-bottom) + 24px (padding-top berikutnya) = 56px`, sama dengan sebelumnya — tidak ada perubahan visual untuk petugas yang tidak terpotong halaman.
- `page-break-inside: avoid` pada `.ttd-block` tetap dipertahankan.

Tidak ada perubahan margin `@page`, tidak ada perubahan layout grid kiri/kanan, tidak menyentuh `print.lpd.$id.tsx`.