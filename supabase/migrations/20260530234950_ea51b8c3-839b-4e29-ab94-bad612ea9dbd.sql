
DROP POLICY IF EXISTS "View own assignments or admin" ON public.detail_petugas;

CREATE POLICY "View assignments of accessible LPD"
ON public.detail_petugas
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::role_aplikasi)
  OR public.is_assigned_to_lpd(auth.uid(), id_lpd)
);
