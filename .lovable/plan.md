## Perubahan format Nomor Surat: 3 → 5 digit

Format baru: `090/NNNNN/P.KI.YYYY` (slug: `090_NNNNN_P.KI.YYYY`).

### 1. Migrasi database (satu migration)

**a. Ubah tipe kolom alokasi (SMALLINT → INTEGER)**
SMALLINT hanya menampung sampai 32.767, sedangkan format 5 digit harus bisa mencapai 99.999.
```sql
ALTER TABLE public.nomor_surat_allocation
  ALTER COLUMN range_start TYPE INTEGER,
  ALTER COLUMN range_end TYPE INTEGER,
  ALTER COLUMN last_used_number TYPE INTEGER;
```
Plus update tanda tangan & body `validate_allocation_range` dan `create_lpd_baru` agar parameter SMALLINT diubah ke INTEGER.

**b. Update fungsi `create_lpd_baru`**
Ganti `lpad(v_nomor::text, 3, '0')` → `lpad(v_nomor::text, 5, '0')` pada `v_no_surat` dan `v_no_surat_slug`.

**c. Update data eksisting `transaksi_lpd` (3 baris)**
```sql
UPDATE transaksi_lpd
SET no_surat = regexp_replace(no_surat, '^090/(\d{1,4})/', '090/' || lpad((regexp_match(no_surat,'^090/(\d+)/'))[1], 5, '0') || '/'),
    no_surat_slug = regexp_replace(no_surat_slug, '^090_(\d{1,4})_', '090_' || lpad((regexp_match(no_surat_slug,'^090_(\d+)_'))[1], 5, '0') || '_')
WHERE no_surat ~ '^090/\d{1,4}/';
```
Hasil: `090/00001/P.KI.2026`, `090/00002/P.KI.2026`, `090/00003/P.KI.2026`.

**d. Update path file di storage `laporan_lpd`**
Dua LPD punya `url_foto` dengan slug lama. Rename path di tabel `storage.objects` agar tetap konsisten dengan slug baru, lalu update kolom `url_foto`:
```sql
UPDATE storage.objects
SET name = replace(name, '/090_001_', '/090_00001_')
WHERE bucket_id = 'laporan_lpd' AND name LIKE '%/090_001_%';
-- ulangi untuk 002 → 00002, 003 → 00003
UPDATE transaksi_lpd
SET url_foto = replace(url_foto, '/090_001_', '/090_00001_')
WHERE url_foto LIKE '%/090_001_%';
-- dst.
```

### 2. Perubahan kode

**a. `src/lib/allocation.functions.ts`** – naikkan `RangeBase` max dari `32000` menjadi `99999`.

**b. `src/routes/_authenticated/master.nomor-surat.tsx`** – default form `range_end: 100` tetap, tapi pastikan input number menerima sampai 99999 (validasi sudah di server).

**c. `src/lib/lpd.functions.ts` dan UI** – tidak ada hardcode 3 digit, jadi cukup mengandalkan output fungsi DB. Saya akan grep ulang setelah masuk build mode untuk memastikan tidak ada `lpad(... 3 ...)` di sisi TS.

**d. `.lovable/plan.md`** – catat perubahan format nomor surat.

### Catatan
- Aplikasi mencari LPD via slug (mis. di route print). Karena baris eksisting di-update sekaligus path storage, link lama yang menggunakan slug 3 digit akan rusak — namun aplikasi merender link dari data terbaru, jadi tidak ada dampak fungsional.
- Tidak ada perubahan UI selain peningkatan batas max input.
