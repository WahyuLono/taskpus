-- Sync status_lpd with approval_status
UPDATE public.transaksi_lpd
   SET status_lpd = 'Belum'::public.status_surat
 WHERE approval_status IN ('Draft'::public.approval_status_lpd,
                           'Menunggu'::public.approval_status_lpd,
                           'Ditolak'::public.approval_status_lpd)
   AND status_lpd <> 'Batal'::public.status_surat;

UPDATE public.transaksi_lpd
   SET status_lpd = 'Sudah'::public.status_surat
 WHERE approval_status = 'Disetujui'::public.approval_status_lpd
   AND status_lpd <> 'Batal'::public.status_surat;

-- approve_lpd: also flip status_lpd to 'Sudah'
CREATE OR REPLACE FUNCTION public.approve_lpd(p_id_lpd uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'Admin'::public.role_aplikasi) THEN
    RAISE EXCEPTION 'Forbidden: only admins can approve LPD';
  END IF;
  UPDATE public.transaksi_lpd
     SET approval_status = 'Disetujui',
         status_lpd = CASE WHEN status_lpd = 'Batal'::public.status_surat
                           THEN status_lpd
                           ELSE 'Sudah'::public.status_surat END,
         approved_by = auth.uid(),
         approved_at = now(),
         catatan_reject = NULL,
         updated_at = now()
   WHERE id_lpd = p_id_lpd;
END;
$function$;

-- reject_lpd: reset status_lpd to 'Belum'
CREATE OR REPLACE FUNCTION public.reject_lpd(p_id_lpd uuid, p_catatan text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'Admin'::public.role_aplikasi) THEN
    RAISE EXCEPTION 'Forbidden: only admins can reject LPD';
  END IF;
  IF p_catatan IS NULL OR length(trim(p_catatan)) < 3 THEN
    RAISE EXCEPTION 'Catatan reject minimal 3 karakter';
  END IF;
  UPDATE public.transaksi_lpd
     SET approval_status = 'Ditolak',
         status_lpd = CASE WHEN status_lpd = 'Batal'::public.status_surat
                           THEN status_lpd
                           ELSE 'Belum'::public.status_surat END,
         catatan_reject = p_catatan,
         approved_by = NULL,
         approved_at = NULL,
         updated_at = now()
   WHERE id_lpd = p_id_lpd;
END;
$function$;