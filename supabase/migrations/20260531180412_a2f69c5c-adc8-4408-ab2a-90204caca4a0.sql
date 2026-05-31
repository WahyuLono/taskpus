UPDATE public.transaksi_lpd
SET input_alat = NULL,
    input_metode = NULL,
    input_lama_kegiatan = NULL,
    proses_sasaran = NULL,
    proses_hambatan = NULL,
    output = NULL,
    tindak_lanjut = NULL,
    url_foto = NULL,
    catatan_reject = NULL,
    status_lpd = 'Belum'::public.status_surat,
    approval_status = 'Draft'::public.approval_status_lpd,
    approved_by = NULL,
    approved_at = NULL,
    updated_at = now()
WHERE no_surat IN ('090/00002/P.KI.2026', '090/00003/P.KI.2026');