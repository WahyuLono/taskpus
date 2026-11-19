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
SECURITY DEFINER
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

REVOKE ALL ON FUNCTION public.get_lpd_schedule_conflicts(date, date, uuid[], uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lpd_schedule_conflicts(date, date, uuid[], uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_lpd_baru(
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
  v_tahun int;
  v_bulan int;
  v_nomor int;
  v_lama_hari int;
  v_no_surat text;
  v_no_surat_slug text;
  v_id_lpd uuid;
  v_path text;
  v_petugas uuid;
  v_conflicts text;
  v_alloc_id smallint;
  v_alloc_start integer;
  v_alloc_end integer;
  v_alloc_last integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'Admin'::public.role_aplikasi) THEN
    RAISE EXCEPTION 'Forbidden: only admins can create LPD';
  END IF;

  IF p_tgl_selesai < p_tgl_kegiatan THEN
    RAISE EXCEPTION 'Tanggal selesai tidak boleh sebelum tanggal kegiatan';
  END IF;
  IF COALESCE(array_length(p_petugas_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Minimal satu petugas harus dipilih';
  END IF;

  -- Serialize concurrent assignment attempts for each selected staff member.
  FOR v_petugas IN
    SELECT DISTINCT x FROM unnest(p_petugas_ids) AS selected(x) ORDER BY x
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(v_petugas::text, 0));
  END LOOP;

  SELECT string_agg(
    format('%s — SPT %s (%s s.d. %s)', c.nama, c.no_surat,
      to_char(c.tgl_kegiatan, 'DD Mon YYYY'), to_char(c.tgl_selesai, 'DD Mon YYYY')),
    '; ' ORDER BY c.nama, c.tgl_kegiatan, c.no_surat
  )
  INTO v_conflicts
  FROM public.get_lpd_schedule_conflicts(p_tgl_kegiatan, p_tgl_selesai, p_petugas_ids, NULL) c;

  IF v_conflicts IS NOT NULL THEN
    RAISE EXCEPTION 'Jadwal petugas bertumpang tindih: %', v_conflicts;
  END IF;

  v_tahun := extract(year from p_tgl_buat);
  v_bulan := extract(month from p_tgl_buat);
  v_lama_hari := (p_tgl_selesai - p_tgl_kegiatan) + 1;

  SELECT id_allocation, range_start, range_end, last_used_number
    INTO v_alloc_id, v_alloc_start, v_alloc_end, v_alloc_last
  FROM public.nomor_surat_allocation
  WHERE tahun = v_tahun AND status = 'Active' AND last_used_number < range_end
  ORDER BY range_start ASC FOR UPDATE LIMIT 1;

  IF v_alloc_id IS NULL THEN
    RAISE EXCEPTION 'Jatah nomor surat tahun % sudah habis.', v_tahun;
  END IF;

  IF v_alloc_last < v_alloc_start THEN
    v_nomor := v_alloc_start;
  ELSE
    v_nomor := v_alloc_last + 1;
  END IF;

  v_no_surat := '090/' || lpad(v_nomor::text, 4, '0') || '/P.KI.' || v_tahun::text;
  v_no_surat_slug := '090_' || lpad(v_nomor::text, 4, '0') || '_P.KI.' || v_tahun::text;

  UPDATE public.nomor_surat_allocation
     SET last_used_number = v_nomor
   WHERE id_allocation = v_alloc_id;

  INSERT INTO public.transaksi_lpd (
    no_surat, no_surat_slug, tgl_buat, tgl_kegiatan, tgl_selesai,
    lama_hari, jenis_perjadin, id_rangka, id_tempat, id_kepala, status_lpd
  ) VALUES (
    v_no_surat, v_no_surat_slug, p_tgl_buat, p_tgl_kegiatan, p_tgl_selesai,
    v_lama_hari, p_jenis_perjadin, p_id_rangka, p_id_tempat, p_id_kepala, 'Belum'
  ) RETURNING id_lpd INTO v_id_lpd;

  FOREACH v_petugas IN ARRAY p_petugas_ids LOOP
    INSERT INTO public.detail_petugas (id_lpd, id_user_petugas)
    VALUES (v_id_lpd, v_petugas);
  END LOOP;

  v_path := v_tahun::text || '/' || lpad(v_bulan::text, 2, '0') || '/' || v_no_surat_slug;

  RETURN jsonb_build_object(
    'status', 'success',
    'id_lpd', v_id_lpd,
    'no_surat', v_no_surat,
    'lama_hari', v_lama_hari,
    'upload_path', v_path
  );
END;
$$;

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
  v_conflicts text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'Admin'::public.role_aplikasi) THEN
    RAISE EXCEPTION 'Forbidden: only admins can edit SPT';
  END IF;

  SELECT * INTO v_row FROM public.transaksi_lpd WHERE id_lpd = p_id_lpd FOR UPDATE;
  IF v_row.id_lpd IS NULL THEN
    RAISE EXCEPTION 'LPD tidak ditemukan';
  END IF;

  IF v_row.approval_status <> 'Draft'::public.approval_status_lpd
     OR v_row.status_lpd <> 'Belum'::public.status_surat THEN
    RAISE EXCEPTION 'SPT tidak bisa diedit. Syarat: status_lpd=Belum & approval_status=Draft (saat ini: %, %).',
      v_row.status_lpd, v_row.approval_status;
  END IF;

  IF p_tgl_selesai < p_tgl_kegiatan THEN
    RAISE EXCEPTION 'Tanggal selesai tidak boleh sebelum tanggal kegiatan';
  END IF;
  IF COALESCE(array_length(p_petugas_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Minimal satu petugas harus dipilih';
  END IF;

  FOR v_petugas IN
    SELECT DISTINCT x FROM unnest(p_petugas_ids) AS selected(x) ORDER BY x
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(v_petugas::text, 0));
  END LOOP;

  SELECT string_agg(
    format('%s — SPT %s (%s s.d. %s)', c.nama, c.no_surat,
      to_char(c.tgl_kegiatan, 'DD Mon YYYY'), to_char(c.tgl_selesai, 'DD Mon YYYY')),
    '; ' ORDER BY c.nama, c.tgl_kegiatan, c.no_surat
  )
  INTO v_conflicts
  FROM public.get_lpd_schedule_conflicts(p_tgl_kegiatan, p_tgl_selesai, p_petugas_ids, p_id_lpd) c;

  IF v_conflicts IS NOT NULL THEN
    RAISE EXCEPTION 'Jadwal petugas bertumpang tindih: %', v_conflicts;
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
    INSERT INTO public.detail_petugas (id_lpd, id_user_petugas)
    VALUES (p_id_lpd, v_petugas);
  END LOOP;

  RETURN jsonb_build_object('status', 'success', 'id_lpd', p_id_lpd, 'lama_hari', v_lama_hari);
END;
$$;