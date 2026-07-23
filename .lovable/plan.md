
## Rencana Eksekusi

### Fase 1 — Reset data (tanpa migration; via insert tool + Storage API)

1. **Hapus semua file di bucket `laporan_lpd`** — via server function sekali-pakai yang memanggil `supabaseAdmin.storage.from('laporan_lpd').list()` rekursif lalu `.remove()`. (Bucket tetap ada, isinya kosong.)
2. **Hapus baris DB** (via insert tool, urutan menghindari FK):
   - `DELETE FROM public.notifikasi;`
   - `DELETE FROM public.detail_petugas;`
   - `DELETE FROM public.transaksi_lpd;`
3. **Reset semua alokasi**: `UPDATE public.nomor_surat_allocation SET last_used_number = range_start - 1;` — definisi range dipertahankan, tapi counter kembali ke titik awal.

### Fase 2 — Ubah format ke 4 digit (via migration)

4. `CREATE OR REPLACE FUNCTION public.create_lpd_baru(...)` — sama persis dengan versi sekarang, hanya mengganti:
   - `lpad(v_nomor::text, 5, '0')` → `lpad(v_nomor::text, 4, '0')` di `v_no_surat`
   - `lpad(v_nomor::text, 5, '0')` → `lpad(v_nomor::text, 4, '0')` di `v_no_surat_slug`
5. Tambah CHECK constraint di `nomor_surat_allocation`:
   ```sql
   ALTER TABLE public.nomor_surat_allocation
     ADD CONSTRAINT alloc_range_4digit CHECK (range_end <= 9999 AND range_start >= 1);
   ```
   (Aman karena semua range existing ≤ 1600.)

### Fase 3 — Sinkronisasi frontend

6. `src/lib/allocation.functions.ts` — ubah `RangeBase` dari `.max(99999)` menjadi `.max(9999)` untuk `range_start` dan `range_end`. Pesan error validasi ikut menyesuaikan.

### Yang TIDAK diubah
- Prefix `090/…/P.KI.YYYY` tetap.
- RLS, fungsi approve/reject/submit_laporan, notifikasi runtime, kompresi foto, UI dashboard/LPD/master — tidak disentuh.
- Definisi range alokasi existing (mis. 1404–1600) dipertahankan, hanya `last_used_number` yang direset.
- Bucket `laporan_lpd` tetap ada dengan setting yang sama (hanya isinya dikosongkan).

### Hasil akhir yang diharapkan
- `transaksi_lpd`, `detail_petugas`, `notifikasi` kosong.
- Bucket `laporan_lpd` kosong.
- SPT berikutnya yang dibuat Admin akan menghasilkan nomor 4 digit, mis. `090/1404/P.KI.2026` (menyesuaikan alokasi aktif tahun berjalan).
- Master nomor surat tidak bisa lagi menerima range > 9999.

### Catatan
Error upload dist di turn sebelumnya adalah gangguan infra S3 (bukan bug kode) — akan hilang saat build berikutnya.
