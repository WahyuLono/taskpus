CREATE OR REPLACE FUNCTION public.get_lpd_schedule_conflicts(
  p_tgl_kegiatan date,
  p_tgl_selesai date,
  p_petugas_ids uuid[],
  p_exclude_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id_user_petugas uuid,
  nama text,
  no_surat text,
  tgl_kegiatan date,
  tgl_selesai date
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'Admin'::public.role_aplikasi) THEN
    RAISE EXCEPTION 'Forbidden: hanya Admin yang dapat memeriksa jadwal petugas';
  END IF;

  IF p_tgl_kegiatan IS NULL OR p_tgl_selesai IS NULL OR p_tgl_selesai < p_tgl_kegiatan
     OR COALESCE(array_length(p_petugas_ids, 1), 0) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT dp.id_user_petugas, mu.nama, tl.no_surat, tl.tgl_kegiatan, tl.tgl_selesai
  FROM public.detail_petugas dp
  JOIN public.master_user mu ON mu.id_user = dp.id_user_petugas
  JOIN public.transaksi_lpd tl ON tl.id_lpd = dp.id_lpd
  WHERE dp.id_user_petugas = ANY(p_petugas_ids)
    AND (p_exclude_id IS NULL OR tl.id_lpd <> p_exclude_id)
    AND tl.deleted_at IS NULL
    AND tl.status_lpd <> 'Batal'::public.status_surat
    AND tl.tgl_kegiatan <= p_tgl_selesai
    AND tl.tgl_selesai >= p_tgl_kegiatan;
END;
$$;

REVOKE ALL ON FUNCTION public.get_lpd_schedule_conflicts(date, date, uuid[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lpd_schedule_conflicts(date, date, uuid[], uuid) TO authenticated;