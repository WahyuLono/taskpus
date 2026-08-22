ALTER TABLE public.master_user ADD COLUMN IF NOT EXISTS no_wa text;

CREATE INDEX IF NOT EXISTS idx_transaksi_lpd_tgl_kegiatan ON public.transaksi_lpd (tgl_kegiatan);
CREATE INDEX IF NOT EXISTS idx_transaksi_lpd_status_lpd ON public.transaksi_lpd (status_lpd);

CREATE TABLE IF NOT EXISTS public.setting_notifikasi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_setting text NOT NULL UNIQUE,
  template_pesan text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.setting_notifikasi TO authenticated;
GRANT ALL ON public.setting_notifikasi TO service_role;

ALTER TABLE public.setting_notifikasi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read setting_notifikasi"
  ON public.setting_notifikasi FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins update setting_notifikasi"
  ON public.setting_notifikasi FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::public.role_aplikasi))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.role_aplikasi));

INSERT INTO public.setting_notifikasi (nama_setting, template_pesan)
VALUES ('reminder_lpd', 'Hallo [nama_petugas] Anda memiliki LPD yang belum di pertanggungjawabkan selama H+7. Segera untuk melakukan input LPD. Berdasarkan No. Surat [no_surat] tertanggal kegiatan anda [tgl_kegiatan]. Untuk melakukan pertanggungjawaban LPD anda bisa masuk ke web resmi taskpus.web.id lalu akses masuk ke user anda. Username : [username] Password : petugas (jika anda belum mengganti password default anda) Atas perhatian dan kerjasamanya, saya ucapkan terima kasih -- Salam, Admin')
ON CONFLICT (nama_setting) DO NOTHING;