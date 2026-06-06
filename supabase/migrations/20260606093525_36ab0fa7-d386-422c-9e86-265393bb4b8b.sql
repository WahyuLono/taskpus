
CREATE TYPE public.notifikasi_tipe AS ENUM ('lpd_submitted','lpd_approved','lpd_rejected');

CREATE TABLE public.notifikasi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user uuid NOT NULL,
  id_lpd uuid,
  tipe public.notifikasi_tipe NOT NULL,
  judul text NOT NULL,
  pesan text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX idx_notifikasi_user_created ON public.notifikasi(id_user, created_at DESC);
CREATE INDEX idx_notifikasi_user_unread ON public.notifikasi(id_user) WHERE is_read = false;

GRANT SELECT, UPDATE ON public.notifikasi TO authenticated;
GRANT ALL ON public.notifikasi TO service_role;

ALTER TABLE public.notifikasi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifikasi" ON public.notifikasi
  FOR SELECT TO authenticated
  USING (auth.uid() = id_user);

CREATE POLICY "Users update own notifikasi" ON public.notifikasi
  FOR UPDATE TO authenticated
  USING (auth.uid() = id_user)
  WITH CHECK (auth.uid() = id_user);

-- Update submit function: notify all admins
CREATE OR REPLACE FUNCTION public.submit_laporan_for_approval(p_id_lpd uuid)
 RETURNS approval_status_lpd
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.transaksi_lpd;
  v_complete boolean;
  v_actor_nama text;
  v_new_status public.approval_status_lpd;
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
    v_new_status := 'Menunggu'::public.approval_status_lpd;

    SELECT nama INTO v_actor_nama FROM public.master_user WHERE id_user = auth.uid();

    INSERT INTO public.notifikasi (id_user, id_lpd, tipe, judul, pesan)
    SELECT u.id_user, p_id_lpd, 'lpd_submitted', 'Laporan menunggu persetujuan',
           'Petugas ' || COALESCE(v_actor_nama,'-') || ' mengajukan LPD ' || v_row.no_surat || ' untuk persetujuan.'
      FROM public.master_user u
     WHERE u.role_user = 'Admin'::public.role_aplikasi;

    RETURN v_new_status;
  END IF;

  RETURN v_row.approval_status;
END;
$function$;

-- Update approve function: notify petugas
CREATE OR REPLACE FUNCTION public.approve_lpd(p_id_lpd uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_no_surat text;
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
   WHERE id_lpd = p_id_lpd
   RETURNING no_surat INTO v_no_surat;

  INSERT INTO public.notifikasi (id_user, id_lpd, tipe, judul, pesan)
  SELECT dp.id_user_petugas, p_id_lpd, 'lpd_approved', 'LPD disetujui',
         'LPD ' || COALESCE(v_no_surat,'-') || ' telah disetujui oleh admin.'
    FROM public.detail_petugas dp
   WHERE dp.id_lpd = p_id_lpd AND dp.id_user_petugas IS NOT NULL;
END;
$function$;

-- Update reject function: notify petugas
CREATE OR REPLACE FUNCTION public.reject_lpd(p_id_lpd uuid, p_catatan text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_no_surat text;
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
   WHERE id_lpd = p_id_lpd
   RETURNING no_surat INTO v_no_surat;

  INSERT INTO public.notifikasi (id_user, id_lpd, tipe, judul, pesan)
  SELECT dp.id_user_petugas, p_id_lpd, 'lpd_rejected', 'LPD ditolak',
         'LPD ' || COALESCE(v_no_surat,'-') || ' ditolak. Catatan: ' || p_catatan
    FROM public.detail_petugas dp
   WHERE dp.id_lpd = p_id_lpd AND dp.id_user_petugas IS NOT NULL;
END;
$function$;
