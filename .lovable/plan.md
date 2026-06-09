## Masalah

Pada card **Substansi** di halaman *Buat SPT*, label opsi terpilih di field **DALAM RANGKA** (mis. "Deteksi Dini dan Cek Kesehatan Gratis Pemantauan dan Tindak Lanjut Penyakit Tidak Menular") membungkus ke beberapa baris dan mendorong tinggi field, sehingga sejajar kolom **TEMPAT** terlihat tidak rapi.

Penyebab: tombol pemicu di `QuickSelect` (`src/routes/_authenticated/lpd.baru.tsx`) memakai `<span>` tanpa `truncate`, dan grid item tidak memiliki `min-w-0` sehingga konten panjang ikut memperlebar kolom dalam grid.

## Perubahan

File: `src/routes/_authenticated/lpd.baru.tsx`

1. **Komponen `QuickSelect` — trigger button**
   - Tambah `min-w-0` pada `<button>` trigger agar child boleh shrink.
   - Bungkus label saat ini dengan `<span className="truncate" title={current?.label}>…</span>` sehingga teks panjang dipotong dengan ellipsis dan tooltip native menampilkan teks utuh saat hover.
   - Pastikan ikon `expand_more` tetap di kanan dan tidak ikut shrink (`shrink-0`).

2. **Grid Substansi (kontainer Dalam Rangka / Tempat / Kepala UPTD)**
   - Pada `Fld` yang membungkus `QuickSelect` "Dalam Rangka" dan "Tempat", tambahkan `min-w-0` agar grid 2 kolom tidak memaksa lebar mengikuti konten panjang.
   - Alternatif setara: tambahkan `min-w-0` pada `<Fld>` lewat wrapper `<div className="min-w-0">`. Implementasi: bungkus kedua `<Fld>` tersebut dengan `<div className="min-w-0">`.

## Yang tidak diubah

- Tidak mengubah logika data, validasi, atau API.
- Tidak mengubah komponen `Fld`/`Section` global.
- Hanya menyentuh layout/CSS di `lpd.baru.tsx`.
