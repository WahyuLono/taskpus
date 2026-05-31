DELETE FROM public.detail_petugas WHERE id_lpd = 'f486bde4-fedc-4c6e-871f-6899b71d0e62';
DELETE FROM public.transaksi_lpd WHERE id_lpd = 'f486bde4-fedc-4c6e-871f-6899b71d0e62';
UPDATE public.nomor_surat_allocation SET last_used_number = 1403, updated_at = now() WHERE id_allocation = 2;