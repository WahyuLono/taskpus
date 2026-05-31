UPDATE public.transaksi_lpd
   SET status_lpd = CASE
     WHEN approval_status = 'Disetujui'::public.approval_status_lpd THEN 'Sudah'::public.status_surat
     WHEN approval_status IN (
       'Draft'::public.approval_status_lpd,
       'Menunggu'::public.approval_status_lpd,
       'Ditolak'::public.approval_status_lpd
     ) THEN 'Belum'::public.status_surat
     ELSE status_lpd
   END,
       updated_at = now()
 WHERE status_lpd <> 'Batal'::public.status_surat
   AND (
     (approval_status = 'Disetujui'::public.approval_status_lpd AND status_lpd <> 'Sudah'::public.status_surat)
     OR
     (approval_status IN (
       'Draft'::public.approval_status_lpd,
       'Menunggu'::public.approval_status_lpd,
       'Ditolak'::public.approval_status_lpd
     ) AND status_lpd <> 'Belum'::public.status_surat)
   );

CREATE OR REPLACE FUNCTION public.submit_laporan_for_approval(p_id_lpd uuid)
 RETURNS approval_status_lpd
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF v_row.approval_status = 'Disetujui'::public.approval_status_lpd THEN
    RETURN v_row.approval_status;
  END IF;

  IF v_row.approval_status = 'Menunggu'::public.approval_status_lpd THEN
    UPDATE public.transaksi_lpd
       SET status_lpd = CASE WHEN status_lpd = 'Batal'::public.status_surat
                             THEN status_lpd
                             ELSE 'Belum'::public.status_surat END,
           updated_at = now()
     WHERE id_lpd = p_id_lpd;
    RETURN 'Menunggu'::public.approval_status_lpd;
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
           status_lpd = CASE WHEN status_lpd = 'Batal'::public.status_surat
                             THEN status_lpd
                             ELSE 'Belum'::public.status_surat END,
           catatan_reject = NULL,
           updated_at = now()
     WHERE id_lpd = p_id_lpd;
    RETURN 'Menunggu'::public.approval_status_lpd;
  END IF;

  RETURN v_row.approval_status;
END;
$function$;