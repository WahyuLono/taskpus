-- 1. Create allocation table
CREATE TABLE public.nomor_surat_allocation (
  id_allocation    SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tahun            SMALLINT NOT NULL,
  range_start      SMALLINT NOT NULL,
  range_end        SMALLINT NOT NULL,
  last_used_number SMALLINT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tahun, range_start),
  CONSTRAINT valid_range CHECK (range_end >= range_start),
  CONSTRAINT valid_start CHECK (range_start >= 1),
  CONSTRAINT valid_last_used CHECK (last_used_number BETWEEN (range_start - 1) AND range_end)
);

CREATE INDEX idx_allocation_tahun_active
  ON public.nomor_surat_allocation (tahun, range_start)
  WHERE status = 'Active';

-- 2. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nomor_surat_allocation TO authenticated;
GRANT ALL ON public.nomor_surat_allocation TO service_role;

-- 3. RLS
ALTER TABLE public.nomor_surat_allocation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_allocation"
  ON public.nomor_surat_allocation
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::public.role_aplikasi))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.role_aplikasi));

CREATE POLICY "petugas_read_allocation"
  ON public.nomor_surat_allocation
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at_allocation()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_allocation_updated_at
  BEFORE UPDATE ON public.nomor_surat_allocation
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_allocation();

-- 5. Overlap validator
CREATE OR REPLACE FUNCTION public.validate_allocation_range(
  p_tahun SMALLINT,
  p_start SMALLINT,
  p_end SMALLINT,
  p_exclude_id SMALLINT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.nomor_surat_allocation
    WHERE tahun = p_tahun
      AND (p_exclude_id IS NULL OR id_allocation <> p_exclude_id)
      AND NOT (range_end < p_start OR range_start > p_end)
  );
$$;

GRANT EXECUTE ON FUNCTION public.validate_allocation_range(SMALLINT, SMALLINT, SMALLINT, SMALLINT) TO authenticated;

-- 6. Replace create_lpd_baru to use allocation
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
    RAISE EXCEPTION 'Jatah nomor surat tahun % sudah habis. Hubungi administrator.', v_tahun;
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

-- 7. Seed allocation for current year based on existing data
DO $$
DECLARE
  v_year SMALLINT := EXTRACT(YEAR FROM CURRENT_DATE);
  v_max INT;
  v_end SMALLINT;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(no_surat FROM '090/([0-9]+)/')::int), 0)
    INTO v_max
  FROM public.transaksi_lpd
  WHERE EXTRACT(YEAR FROM tgl_buat) = v_year;

  v_end := GREATEST(100, v_max)::smallint;

  INSERT INTO public.nomor_surat_allocation (tahun, range_start, range_end, last_used_number, status)
  VALUES (v_year, 1, v_end, v_max::smallint, 'Active')
  ON CONFLICT (tahun, range_start) DO NOTHING;
END $$;