
-- Storage policies for bucket laporan_lpd (already exists, private)

DROP POLICY IF EXISTS "laporan_lpd read access" ON storage.objects;
DROP POLICY IF EXISTS "laporan_lpd insert access" ON storage.objects;
DROP POLICY IF EXISTS "laporan_lpd update access" ON storage.objects;
DROP POLICY IF EXISTS "laporan_lpd delete access" ON storage.objects;

CREATE POLICY "laporan_lpd read access"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'laporan_lpd' AND (
    public.has_role(auth.uid(), 'Admin'::public.role_aplikasi)
    OR public.user_can_access_lpd_path(name)
  )
);

CREATE POLICY "laporan_lpd insert access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'laporan_lpd' AND (
    public.has_role(auth.uid(), 'Admin'::public.role_aplikasi)
    OR public.user_can_access_lpd_path(name)
  )
);

CREATE POLICY "laporan_lpd update access"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'laporan_lpd' AND (
    public.has_role(auth.uid(), 'Admin'::public.role_aplikasi)
    OR public.user_can_access_lpd_path(name)
  )
);

CREATE POLICY "laporan_lpd delete access"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'laporan_lpd' AND public.has_role(auth.uid(), 'Admin'::public.role_aplikasi)
);
