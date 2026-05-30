## Tujuan
Petugas dapat melihat seluruh rekan satu penugasan pada detail LPD (bukan hanya dirinya sendiri).

## Perubahan
Migrasi RLS pada `public.detail_petugas`:

```sql
DROP POLICY "View own assignments or admin" ON public.detail_petugas;

CREATE POLICY "View assignments of accessible LPD"
ON public.detail_petugas
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::role_aplikasi)
  OR public.is_assigned_to_lpd(auth.uid(), id_lpd)
);
```

Tidak ada perubahan kode frontend / server function.