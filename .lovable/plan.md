## Masalah
Kolom `master_user.email_internal` adalah **GENERATED ALWAYS** (`nip || '@lpd.internal'`). Postgres menolak insert yang mengirim nilai eksplisit ke kolom ini → error "cannot insert a non-DEFAULT value into column email_internal".

## Perbaikan
Di `src/lib/master-admin.functions.ts` pada `createUser`, hapus field `email_internal` dari payload `supabaseAdmin.from("master_user").insert({...})`. Email auth user tetap dibuat dari `${nip}@lpd.internal` seperti sekarang — kolom DB akan terisi otomatis oleh generated expression.

Tidak ada perubahan lain yang diperlukan.