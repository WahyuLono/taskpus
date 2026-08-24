-- 1) Blokir perubahan isi laporan oleh siapa pun yang bukan petugas ditugaskan
CREATE OR REPLACE FUNCTION public.guard_laporan_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_changed boolean;
BEGIN
  v_changed :=
       coalesce(NEW.input_alat,'')          IS DISTINCT FROM coalesce(OLD.input_alat,'')
    OR coalesce(NEW.input_metode,'')        IS DISTINCT FROM coalesce(OLD.input_metode,'')
    OR coalesce(NEW.input_lama_kegiatan,'') IS DISTINCT FROM coalesce(OLD.input_lama_kegiatan,'')
    OR coalesce(NEW.proses_sasaran,'')      IS DISTINCT FROM coalesce(OLD.proses_sasaran,'')
    OR coalesce(NEW.proses_hambatan,'')     IS DISTINCT FROM coalesce(OLD.proses_hambatan,'')
    OR coalesce(NEW.output,'')              IS DISTINCT FROM coalesce(OLD.output,'')
    OR coalesce(NEW.tindak_lanjut,'')       IS DISTINCT FROM coalesce(OLD.tindak_lanjut,'')
    OR coalesce(NEW.url_foto,'')            IS DISTINCT FROM coalesce(OLD.url_foto,'')
    OR coalesce(NEW.url_foto_2,'')          IS DISTINCT FROM coalesce(OLD.url_foto_2,'');

  IF v_changed AND auth.uid() IS NOT NULL
     AND NOT public.is_assigned_to_lpd(auth.uid(), OLD.id_lpd) THEN
    RAISE EXCEPTION 'Hanya petugas yang ditugaskan pada surat tugas ini yang dapat mengisi laporan LPD.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_laporan_fields ON public.transaksi_lpd;
CREATE TRIGGER trg_guard_laporan_fields
BEFORE UPDATE ON public.transaksi_lpd
FOR EACH ROW EXECUTE FUNCTION public.guard_laporan_fields();

-- 2) Kirim untuk persetujuan: hanya petugas ditugaskan + mulai tanggal selesai kegiatan
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
  v_today date;
BEGIN
  SELECT * INTO v_row FROM public.transaksi_lpd WHERE id_lpd = p_id_lpd;
  IF v_row.id_lpd IS NULL THEN
    RAISE EXCEPTION 'LPD tidak ditemukan';
  END IF;

  IF NOT public.is_assigned_to_lpd(auth.uid(), p_id_lpd) THEN
    RAISE EXCEPTION 'Hanya petugas yang ditugaskan pada surat tugas ini yang dapat mengirim LPD untuk persetujuan.';
  END IF;

  IF v_row.approval_status = 'Disetujui'::public.approval_status_lpd THEN
    RETURN v_row.approval_status;
  END IF;

  v_today := (now() AT TIME ZONE 'Asia/Jakarta')::date;
  IF v_today < v_row.tgl_selesai THEN
    RAISE EXCEPTION 'Pengisian LPD dibuka mulai tanggal % (setelah kegiatan selesai).',
      to_char(v_row.tgl_selesai, 'DD-MM-YYYY');
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