## Tujuan
Membersihkan sisa testing nomor surat agar SPT berikutnya dimulai dari `090/01404/P.KI.2026`.

## Temuan di backend
- `nomor_surat_allocation` id=2 → `range_start=1404`, `last_used_number=1405`, status Active.
- `transaksi_lpd` punya 1 baris hasil testing: `090/01405/P.KI.2026` (id_lpd `f486bde4-fedc-4c6e-871f-6899b71d0e62`, dibuat 2026-05-31 19:17).
- Tidak ada baris dengan nomor "140" / "1404" — yang itu sudah pernah dihapus manual.
- Counter `last_used_number` adalah biang masalahnya: ia maju ke 1405 walau row 140 lama sudah dihapus, sehingga generator memberikan 1405 bukan 1404.

## Rencana pembersihan (data-only, lewat insert tool)
Satu transaksi berisi:

1. `DELETE FROM public.detail_petugas WHERE id_lpd = 'f486bde4-fedc-4c6e-871f-6899b71d0e62';`
2. `DELETE FROM public.transaksi_lpd WHERE id_lpd = 'f486bde4-fedc-4c6e-871f-6899b71d0e62';`
3. `UPDATE public.nomor_surat_allocation SET last_used_number = 1403, updated_at = now() WHERE id_allocation = 2;`

Kenapa `1403`, bukan `1404`? RPC `create_lpd_baru` memakai aturan:
```text
IF last_used_number < range_start THEN v_nomor := range_start
ELSE v_nomor := last_used_number + 1
```
Jadi dengan `last_used_number=1403` (< 1404), generator berikutnya akan menghasilkan tepat `1404` → `090/01404/P.KI.2026`.

## Verifikasi setelah eksekusi
- `SELECT * FROM nomor_surat_allocation WHERE id_allocation = 2;` → `last_used_number = 1403`.
- `SELECT COUNT(*) FROM transaksi_lpd WHERE no_surat_slug = '090_01405_P.KI.2026';` → 0.
- Admin buat SPT baru → nomor yang muncul harus `090/01404/P.KI.2026`.

## Catatan
- Tidak ada perubahan skema, RPC, atau kode frontend. Murni cleanup data.
- Tidak menyentuh allocation id=1 (range 1–3, Inactive) — biarkan apa adanya karena masih dipakai 3 SPT lama (00001–00003).
