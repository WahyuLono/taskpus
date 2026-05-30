ALTER TABLE public.transaksi_lpd
  ADD COLUMN input_alat            text,
  ADD COLUMN input_metode          text,
  ADD COLUMN input_lama_kegiatan   text,
  ADD COLUMN proses_sasaran        text,
  ADD COLUMN proses_hambatan       text,
  ADD COLUMN output                text,
  ADD COLUMN tindak_lanjut         text;

UPDATE public.transaksi_lpd
   SET status_lpd = 'Belum'::public.status_surat,
       url_foto   = NULL
 WHERE hasil_kegiatan IS NOT NULL;

ALTER TABLE public.transaksi_lpd DROP COLUMN hasil_kegiatan;