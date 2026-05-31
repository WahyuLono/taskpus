-- Approval workflow for LPD
CREATE TYPE public.approval_status_lpd AS ENUM ('Draft', 'Menunggu', 'Disetujui', 'Ditolak');

ALTER TABLE public.transaksi_lpd
  ADD COLUMN approval_status public.approval_status_lpd NOT NULL DEFAULT 'Draft',
  ADD COLUMN catatan_reject text NULL,
  ADD COLUMN approved_by uuid NULL,
  ADD COLUMN approved_at timestamptz NULL;

CREATE INDEX idx_transaksi_lpd_approval_status ON public.transaksi_lpd(approval_status);

-- Backfill existing rows: if laporan looks filled, set to Disetujui (so existing data tetap bisa cetak); else Draft
UPDATE public.transaksi_lpd
SET approval_status = 'Disetujui',
    approved_at = now()
WHERE coalesce(input_alat,'') <> ''
  AND coalesce(input_metode,'') <> ''
  AND coalesce(proses_sasaran,'') <> ''
  AND coalesce(output,'') <> ''
  AND coalesce(tindak_lanjut,'') <> ''
  AND coalesce(url_foto,'') <> '';

-- Split RLS policy: petugas hanya boleh UPDATE saat Draft/Ditolak; admin selalu boleh
DROP POLICY IF EXISTS "Update assigned or admin" ON public.transaksi_lpd;

CREATE POLICY "Admin update lpd"
ON public.transaksi_lpd
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'Admin'::role_aplikasi))
WITH CHECK (has_role(auth.uid(), 'Admin'::role_aplikasi));

CREATE POLICY "Petugas update lpd when editable"
ON public.transaksi_lpd
FOR UPDATE
TO authenticated
USING (
  is_assigned_to_lpd(auth.uid(), id_lpd)
  AND approval_status IN ('Draft'::approval_status_lpd, 'Ditolak'::approval_status_lpd)
)
WITH CHECK (
  is_assigned_to_lpd(auth.uid(), id_lpd)
  AND approval_status IN ('Draft'::approval_status_lpd, 'Menunggu'::approval_status_lpd, 'Ditolak'::approval_status_lpd)
);

-- RPC: approve
CREATE OR REPLACE FUNCTION public.approve_lpd(p_id_lpd uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'Admin'::public.role_aplikasi) THEN
    RAISE EXCEPTION 'Forbidden: only admins can approve LPD';
  END IF;
  UPDATE public.transaksi_lpd
     SET approval_status = 'Disetujui',
         approved_by = auth.uid(),
         approved_at = now(),
         catatan_reject = NULL,
         updated_at = now()
   WHERE id_lpd = p_id_lpd;
END;
$$;

-- RPC: reject
CREATE OR REPLACE FUNCTION public.reject_lpd(p_id_lpd uuid, p_catatan text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'Admin'::public.role_aplikasi) THEN
    RAISE EXCEPTION 'Forbidden: only admins can reject LPD';
  END IF;
  IF p_catatan IS NULL OR length(trim(p_catatan)) < 3 THEN
    RAISE EXCEPTION 'Catatan reject minimal 3 karakter';
  END IF;
  UPDATE public.transaksi_lpd
     SET approval_status = 'Ditolak',
         catatan_reject = p_catatan,
         approved_by = NULL,
         approved_at = NULL,
         updated_at = now()
   WHERE id_lpd = p_id_lpd;
END;
$$;

-- RPC: submit laporan (petugas) — set status to Menunggu if all fields filled
CREATE OR REPLACE FUNCTION public.submit_laporan_for_approval(p_id_lpd uuid)
RETURNS public.approval_status_lpd
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.transaksi_lpd;
  v_complete boolean;
BEGIN
  SELECT * INTO v_row FROM public.transaksi_lpd WHERE id_lpd = p_id_lpd;
  IF v_row.id_lpd IS NULL THEN
    RAISE EXCEPTION 'LPD tidak ditemukan';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'Admin'::public.role_aplikasi)
          OR public.is_assigned_to_lpd(auth.uid(), p_id_lpd)) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF v_row.approval_status IN ('Menunggu'::public.approval_status_lpd, 'Disetujui'::public.approval_status_lpd) THEN
    RETURN v_row.approval_status;
  END IF;

  v_complete := coalesce(v_row.input_alat,'') <> ''
            AND coalesce(v_row.input_metode,'') <> ''
            AND coalesce(v_row.input_lama_kegiatan,'') <> ''
            AND coalesce(v_row.proses_sasaran,'') <> ''
            AND coalesce(v_row.proses_hambatan,'') <> ''
            AND coalesce(v_row.output,'') <> ''
            AND coalesce(v_row.tindak_lanjut,'') <> ''
            AND coalesce(v_row.url_foto,'') <> '';

  IF v_complete THEN
    UPDATE public.transaksi_lpd
       SET approval_status = 'Menunggu',
           catatan_reject = NULL,
           updated_at = now()
     WHERE id_lpd = p_id_lpd;
    RETURN 'Menunggu'::public.approval_status_lpd;
  END IF;

  RETURN v_row.approval_status;
END;
$$;