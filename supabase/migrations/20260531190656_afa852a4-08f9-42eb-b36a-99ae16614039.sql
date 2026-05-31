CREATE OR REPLACE FUNCTION public.update_lpd_spt(
  p_id_lpd uuid,
  p_tgl_buat date,
  p_tgl_kegiatan date,
  p_tgl_selesai date,
  p_jenis_perjadin text,
  p_id_rangka integer,
  p_id_tempat integer,
  p_id_kepala uuid,
  p_petugas_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.transaksi_lpd;
  v_lama_hari int;
  v_petugas uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'Admin'::public.role_aplikasi) THEN
    RAISE EXCEPTION 'Forbidden: only admins can edit SPT';
  END IF;

  SELECT * INTO v_row FROM public.transaksi_lpd WHERE id_lpd = p_id_lpd;
  IF v_row.id_lpd IS NULL THEN
    RAISE EXCEPTION 'LPD tidak ditemukan';
  END IF;

  IF v_row.approval_status IN ('Menunggu'::public.approval_status_lpd, 'Disetujui'::public.approval_status_lpd) THEN
    RAISE EXCEPTION 'SPT tidak bisa diedit karena laporan sudah % oleh petugas.', v_row.approval_status;
  END IF;

  IF p_tgl_selesai < p_tgl_kegiatan THEN
    RAISE EXCEPTION 'Tanggal selesai tidak boleh sebelum tanggal kegiatan';
  END IF;

  IF array_length(p_petugas_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Minimal satu petugas harus dipilih';
  END IF;

  v_lama_hari := (p_tgl_selesai - p_tgl_kegiatan) + 1;

  UPDATE public.transaksi_lpd
     SET tgl_buat = p_tgl_buat,
         tgl_kegiatan = p_tgl_kegiatan,
         tgl_selesai = p_tgl_selesai,
         lama_hari = v_lama_hari,
         jenis_perjadin = p_jenis_perjadin,
         id_rangka = p_id_rangka,
         id_tempat = p_id_tempat,
         id_kepala = p_id_kepala,
         updated_at = now()
   WHERE id_lpd = p_id_lpd;

  DELETE FROM public.detail_petugas WHERE id_lpd = p_id_lpd;
  FOREACH v_petugas IN ARRAY p_petugas_ids LOOP
    INSERT INTO public.detail_petugas (id_lpd, id_user_petugas) VALUES (p_id_lpd, v_petugas);
  END LOOP;

  RETURN jsonb_build_object('status', 'success', 'id_lpd', p_id_lpd, 'lama_hari', v_lama_hari);
END;
$$;