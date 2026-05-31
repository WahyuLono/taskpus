
-- 1. Ubah tipe kolom alokasi SMALLINT → INTEGER
ALTER TABLE public.nomor_surat_allocation
  ALTER COLUMN range_start TYPE INTEGER,
  ALTER COLUMN range_end TYPE INTEGER,
  ALTER COLUMN last_used_number TYPE INTEGER;

-- 2. Recreate validate_allocation_range dengan INTEGER
DROP FUNCTION IF EXISTS public.validate_allocation_range(smallint, smallint, smallint, smallint);

CREATE OR REPLACE FUNCTION public.validate_allocation_range(
  p_tahun smallint, p_start integer, p_end integer, p_exclude_id smallint DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.nomor_surat_allocation
    WHERE tahun = p_tahun
      AND (p_exclude_id IS NULL OR id_allocation <> p_exclude_id)
      AND NOT (range_end < p_start OR range_start > p_end)
  );
$$;

-- 3. Recreate create_lpd_baru dengan lpad 5 digit & INTEGER vars
CREATE OR REPLACE FUNCTION public.create_lpd_baru(
  p_tgl_buat date, p_tgl_kegiatan date, p_tgl_selesai date,
  p_jenis_perjadin text, p_id_rangka integer, p_id_tempat integer,
  p_id_kepala uuid, p_petugas_ids uuid[]
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
  v_alloc_start integer;
  v_alloc_end integer;
  v_alloc_last integer;
begin
  if not public.has_role(auth.uid(), 'Admin'::public.role_aplikasi) then
    raise exception 'Forbidden: only admins can create LPD';
  end if;

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

  v_no_surat := '090/' || lpad(v_nomor::text, 5, '0') || '/P.KI.' || v_tahun::text;
  v_no_surat_slug := '090_' || lpad(v_nomor::text, 5, '0') || '_P.KI.' || v_tahun::text;

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

-- 4. Normalisasi data eksisting transaksi_lpd ke format 5 digit
UPDATE public.transaksi_lpd
SET no_surat = '090/' || lpad((regexp_match(no_surat,'^090/(\d+)/'))[1], 5, '0') || '/' ||
               split_part(no_surat, '/', 3),
    no_surat_slug = '090_' || lpad((regexp_match(no_surat_slug,'^090_(\d+)_'))[1], 5, '0') || '_' ||
                    split_part(no_surat_slug, '_', 3)
WHERE no_surat ~ '^090/\d{1,4}/';

-- 5. Rename path file di storage.objects + update url_foto
UPDATE storage.objects
SET name = regexp_replace(name, '/090_(\d+)_', '/090_' || lpad((regexp_match(name,'/090_(\d+)_'))[1], 5, '0') || '_')
WHERE bucket_id = 'laporan_lpd' AND name ~ '/090_\d{1,4}_';

UPDATE public.transaksi_lpd
SET url_foto = regexp_replace(url_foto, '/090_(\d+)_', '/090_' || lpad((regexp_match(url_foto,'/090_(\d+)_'))[1], 5, '0') || '_')
WHERE url_foto ~ '/090_\d{1,4}_';
