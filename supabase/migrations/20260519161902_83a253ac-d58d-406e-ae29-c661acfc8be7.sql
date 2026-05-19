ALTER TABLE public.master_user ALTER COLUMN nip DROP NOT NULL;

ALTER TABLE public.master_user DROP COLUMN email_internal;

ALTER TABLE public.master_user ADD COLUMN username text;

ALTER TABLE public.master_user
  ADD CONSTRAINT master_user_username_format_chk
  CHECK (
    username IS NULL OR (
      char_length(username) BETWEEN 1 AND 20
      AND position('@' in username) = 0
      AND username !~ '\s'
    )
  );

CREATE UNIQUE INDEX master_user_username_lower_uidx
  ON public.master_user (lower(username))
  WHERE username IS NOT NULL;

CREATE UNIQUE INDEX master_user_nip_uidx
  ON public.master_user (nip)
  WHERE nip IS NOT NULL;

ALTER TABLE public.master_user
  ADD COLUMN email_internal text
  GENERATED ALWAYS AS (COALESCE(nip::text, lower(username)) || '@lpd.internal') STORED;

ALTER TABLE public.master_user
  ADD CONSTRAINT master_user_status_identity_chk
  CHECK (
    (status_kepegawaian = 'ASN'::status_pegawai AND nip IS NOT NULL)
    OR
    (status_kepegawaian = 'NON ASN'::status_pegawai AND nip IS NULL AND username IS NOT NULL AND id_golongan IS NULL)
  );