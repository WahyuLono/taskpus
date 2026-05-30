CREATE OR REPLACE FUNCTION public.create_lpd_baru(
  p_tgl_buat date,
  p_tgl_kegiatan date,
  p_tgl_selesai date,
  p_jenis_perjadin text,
  p_id_rangka integer,
  p_id_tempat integer,
  p_id_kepala uuid,
  p_petugas_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  v_tahun int;
  v_bulan int;
  v_nomor int;
  v_lama_hari int;
  v_no_surat text;
  v_no_surat_slug text;
  v_id_lpd uuid;
  v_path text;
  v_petugas uuid;
  v_alloc_id smallint;
  v_alloc_start smallint;
  v_alloc_end smallint;
  v_alloc_last smallint;
begin
  if not public.has_role(auth.uid(), 'Admin'::public.role_aplikasi) then
    raise exception 'Forbidden: only admins can create LPD';
  end if;

  v_tahun := extract(year from p_tgl_buat);
  v_bulan := extract(month from p_tgl_buat);
  v_lama_hari := (p_tgl_selesai - p_tgl_kegiatan) + 1;

  -- Lock & pick oldest active allocation in tahun with remaining quota
  SELECT id_allocation, range_start, range_end, last_used_number
    INTO v_alloc_id, v_alloc_start, v_alloc_end, v_alloc_last
  FROM public.nomor_surat_allocation
  WHERE tahun = v_tahun
    AND status = 'Active'
    AND last_used_number < range_end
  ORDER BY range_start ASC
  FOR UPDATE
  LIMIT 1;

  IF v_alloc_id IS NULL THEN
    RAISE EXCEPTION 'Jatah nomor surat tahun % sudah habis.', v_tahun;
  END IF;

  IF v_alloc_last < v_alloc_start THEN
    v_nomor := v_alloc_start;
  ELSE
    v_nomor := v_alloc_last + 1;
  END IF;

  v_no_surat := '090/' || lpad(v_nomor::text, 3, '0') || '/P.KI.' || v_tahun::text;
  v_no_surat_slug := '090_' || lpad(v_nomor::text, 3, '0') || '_P.KI.' || v_tahun::text;

  UPDATE public.nomor_surat_allocation
     SET last_used_number = v_nomor
   WHERE id_allocation = v_alloc_id;

  insert into public.transaksi_lpd (
    no_surat, no_surat_slug, tgl_buat, tgl_kegiatan, tgl_selesai,
    lama_hari, jenis_perjadin, id_rangka, id_tempat, id_kepala, status_lpd
  ) values (
    v_no_surat, v_no_surat_slug, p_tgl_buat, p_tgl_kegiatan, p_tgl_selesai,
    v_lama_hari, p_jenis_perjadin, p_id_rangka, p_id_tempat, p_id_kepala, 'Belum'
  ) returning id_lpd into v_id_lpd;

  foreach v_petugas in array p_petugas_ids loop
    insert into public.detail_petugas (id_lpd, id_user_petugas)
    values (v_id_lpd, v_petugas);
  end loop;

  v_path := v_tahun::text || '/' || lpad(v_bulan::text, 2, '0') || '/' || v_no_surat_slug;

  return jsonb_build_object(
    'status', 'success',
    'id_lpd', v_id_lpd,
    'no_surat', v_no_surat,
    'lama_hari', v_lama_hari,
    'upload_path', v_path
  );
end;
$$;