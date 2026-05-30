## Konteks

Frontend `LaporanForm` & `LaporanReadonly` di `src/routes/_authenticated/lpd.$id.tsx` sudah pakai 7 field terstruktur, tapi masih di-serialize ke kolom lama `hasil_kegiatan` (JSON string). Backend perlu disesuaikan supaya 7 field disimpan di kolomnya masing-masing.

Strategi data lama: **Opsi B** — 1 LPD testing yang berstatus `Selesai` di-reset ke `Belum`, `url_foto` di-NULL-kan, file di bucket `laporan_lpd` dihapus, baru kolom `hasil_kegiatan` di-drop.

## 1. Migrasi DB (`transaksi_lpd` + storage)

Satu migrasi, urutan strict:

```sql
-- a. Tambah 7 kolom baru (nullable; required-check tetap di server fn)
ALTER TABLE public.transaksi_lpd
  ADD COLUMN input_alat            text,
  ADD COLUMN input_metode          text,
  ADD COLUMN input_lama_kegiatan   text,
  ADD COLUMN proses_sasaran        text,
  ADD COLUMN proses_hambatan       text,
  ADD COLUMN output                text,
  ADD COLUMN tindak_lanjut         text;

-- b. Reset LPD lama yang sudah Selesai pakai hasil_kegiatan (Opsi B)
--    - status balik ke 'Belum'
--    - url_foto di-NULL
UPDATE public.transaksi_lpd
   SET status_lpd = 'Belum'::public.status_surat,
       url_foto   = NULL
 WHERE hasil_kegiatan IS NOT NULL;

-- c. Hapus file foto LPD tsb di bucket laporan_lpd
DELETE FROM storage.objects
 WHERE bucket_id = 'laporan_lpd';
-- (bucket privat, dipakai hanya untuk foto LPD; sekarang belum ada
--  data produksi yang dipertahankan, jadi aman menghapus semua object)

-- d. Drop kolom lama
ALTER TABLE public.transaksi_lpd DROP COLUMN hasil_kegiatan;
```

Tidak perlu GRANT baru (kolom tambahan di tabel yang sudah ada).

## 2. Server function `src/lib/lpd.functions.ts`

`submitLaporan`:

- **inputValidator (Zod)** ganti dari `{ hasil_kegiatan: string, ... }` jadi:
  ```ts
  z.object({
    id_lpd: z.string().uuid(),
    foto_path: z.string().min(1),
    laporan: z.object({
      alat:           z.string().trim().min(1).max(500),
      metode:         z.string().trim().min(1).max(500),
      lama_kegiatan:  z.string().trim().min(1).max(500),
      sasaran:        z.string().trim().min(1).max(500),
      hambatan:       z.string().trim().min(1).max(500),
      output:         z.string().trim().min(1).max(500),
      tindak_lanjut:  z.string().trim().min(1).max(500),
    }),
  })
  ```
- **handler** update `transaksi_lpd` dengan 7 kolom baru + `url_foto` + `status_lpd = 'Selesai'`.

`getLpdDetail` mapper:

- Hapus `hasil_kegiatan` dari select & return shape.
- Tambah 7 kolom baru ke return shape (`laporan: { alat, metode, ... } | null`; `null` kalau semua kosong, jadi readonly bisa tahu "belum ada laporan").

## 3. Types

Setelah migrasi disetujui & dijalankan, `src/integrations/supabase/types.ts` otomatis regen oleh sistem. Tidak diedit manual.

## 4. Frontend `src/routes/_authenticated/lpd.$id.tsx`

- Hapus helper `parseLaporan` + `EMPTY_LAPORAN` (sudah tidak perlu parse JSON).
- `LaporanReadonly`: terima `laporan` object langsung dari `lpd.laporan` (null → tampilkan empty state "Laporan belum diisi" yang sudah ada).
- `LaporanFormView` `mut.mutationFn`: kirim `{ id_lpd, foto_path, laporan: form }` — tanpa `JSON.stringify`.
- Tipe `LpdDetail` di-narrow: ganti `hasil_kegiatan: string | null` jadi `laporan: { ... } | null`.

## Skup yang TIDAK termasuk

- `print.lpd.$id.tsx` — tidak menampilkan `hasil_kegiatan`, jadi tetap.
- Dashboard / list LPD — tidak menampilkan isi laporan.
- Tidak ada DB constraint NOT NULL di 7 kolom baru (server fn yang menjamin wajib isi saat submit; sebelum submit kolom memang harus null).

## Risiko & catatan

- LPD testing akan kelihatan sebagai "Belum" di list — petugas perlu tahu untuk isi ulang via form baru. Saya akan mention ini di chat setelah migrasi jalan.
- `DELETE FROM storage.objects WHERE bucket_id = 'laporan_lpd'` menghapus semua file di bucket; saat ini cuma berisi foto LPD testing, jadi aman. Kalau Anda ragu, bisa diganti jadi filter spesifik berdasarkan path LPD tsb — beri tahu saya kalau mau di-narrow.
