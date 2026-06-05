## Tujuan
Pada cetak LPD (`/print/laporan/$id`), bagian "Yang Melaksanakan Perjalanan Dinas" saat ini menampilkan Nama + NIP di atas, lalu garis tanda tangan `(……………)` jauh di bawah kanan. Client minta garis tanda tangan tetap di kanan, Nama/NIP tetap di kiri, tapi **posisi Nama/NIP diturunkan agar sejajar (satu baris) dengan garis tanda tangan**.

## File yang diubah
- `src/routes/print.laporan.$id.tsx` (hanya bagian render petugas + CSS `.ttd-block` / `.ttd-row` / `.ttd-line`)

Tidak ada perubahan data, logic, atau file lain.

## Perubahan layout (visual)

Sebelum:
```text
1. Nama : DR. VENY ANDAYANI
   NIP  : 19860213...
                                          (……………………………………)
```

Sesudah:
```text
1. Nama : DR. VENY ANDAYANI
   NIP  : 19860213...                     (……………………………………)
```

Garis tanda tangan berada di kanan, **sejajar vertikal dengan baris NIP** (baris terakhir blok kiri). Ruang kosong di atas garis tetap ada untuk paraf basah — dicapai dengan memberi `margin-top` pada **seluruh blok petugas** (jarak antar petugas), bukan pada garisnya saja.

## Detail teknis
1. Bungkus tiap petugas dalam grid 2 kolom: kiri = Nama/NIP, kanan = garis ttd.
2. Kolom kanan pakai `align-self: end` agar garis menempel ke baris bawah blok kiri (NIP).
3. Hapus `margin-top: 56px` dari `.ttd-line`; pindahkan jarak antar-petugas ke `.ttd-block` (`margin-bottom` diperbesar, mis. 48–56px) supaya tetap ada ruang untuk paraf.
4. Pertahankan `page-break-inside: avoid` agar satu petugas tidak terpotong antar halaman.

Tidak menyentuh `print.lpd.$id.tsx` (SPT) — perubahan hanya untuk cetak LPD/Laporan sesuai screenshot.
