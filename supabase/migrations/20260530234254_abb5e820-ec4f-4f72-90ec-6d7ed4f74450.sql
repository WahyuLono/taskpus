
-- Helper: check if _target_user shares any LPD assignment with _requester
CREATE OR REPLACE FUNCTION public.shares_lpd_assignment(_requester uuid, _target_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.detail_petugas dp_req
    JOIN public.detail_petugas dp_tgt ON dp_tgt.id_lpd = dp_req.id_lpd
    WHERE dp_req.id_user_petugas = _requester
      AND dp_tgt.id_user_petugas = _target_user
  )
$$;

-- Helper: check if _target_user is kepala on any LPD that _requester is assigned to
CREATE OR REPLACE FUNCTION public.is_kepala_of_requester_lpd(_requester uuid, _target_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.transaksi_lpd t
    JOIN public.detail_petugas dp ON dp.id_lpd = t.id_lpd
    WHERE t.id_kepala = _target_user
      AND dp.id_user_petugas = _requester
  )
$$;

-- Drop old narrow policy
DROP POLICY IF EXISTS "Users read own row" ON public.master_user;

-- New scoped read policy (Opsi B)
CREATE POLICY "Users read own, kepala, and co-petugas"
ON public.master_user
FOR SELECT
TO authenticated
USING (
  auth.uid() = id_user
  OR public.shares_lpd_assignment(auth.uid(), id_user)
  OR public.is_kepala_of_requester_lpd(auth.uid(), id_user)
);
