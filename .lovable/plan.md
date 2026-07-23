## Rencana Perbaikan

1. **Ubah Supabase browser client ke cookie-based session**
   - Tambahkan dependency `@supabase/ssr`.
   - Ganti konfigurasi `src/integrations/supabase/client.ts` dari storage `localStorage` ke `createBrowserClient(...)` agar sesi Supabase ditulis ke HTTP cookies.
   - Pertahankan API import yang sama (`supabase`) supaya komponen yang ada tidak perlu diubah besar-besaran.

2. **Perkuat middleware pengirim token pada Server Functions**
   - Perbarui `src/integrations/supabase/auth-attacher.ts` supaya tetap mengirim `Authorization: Bearer <token>` untuk setiap `createServerFn`.
   - Token diambil dari sesi Supabase yang sekarang tersinkron melalui cookie, dengan refresh proaktif saat hampir kedaluwarsa.
   - Jika sesi belum siap saat hydration/window focus, beri retry singkat sebelum request dilepas.

3. **Perkuat middleware server agar tidak hanya bergantung pada header**
   - Perbarui `src/integrations/supabase/auth-middleware.ts`.
   - Alur utama tetap membaca `Authorization` header.
   - Jika header tidak ada, middleware akan membaca cookie Supabase dari request Cloudflare Worker menggunakan `@supabase/ssr` server client.
   - Setelah user valid, middleware tetap membuat Supabase client server-side yang membawa bearer token user, sehingga RLS dan role Admin/Petugas tetap benar.

4. **Rapikan guard sesi di route/hook yang rawan race**
   - `/_authenticated` dan `/login` menggunakan `supabase.auth.getUser()` atau sesi cookie-backed yang valid, bukan sekadar cache localStorage.
   - `useSession()` tetap mendengar `onAuthStateChange`, tetapi sumber sesi sudah cookie-backed sehingga refetch/window focus tidak membuat user turun menjadi guest.

5. **Kurangi refetch auth yang terlalu agresif**
   - Di `src/routes/__root.tsx`, filter event auth hanya untuk `SIGNED_IN`, `SIGNED_OUT`, dan `USER_UPDATED`.
   - Hindari invalidasi query pada event seperti `INITIAL_SESSION` atau `TOKEN_REFRESHED` agar tidak memicu request Server Function terlalu dini/berulang saat token sedang refresh.

6. **Verifikasi**
   - Login sebagai Admin di custom domain/production.
   - Hard refresh `/dashboard`, pindah tab lalu fokus kembali, dan buka fitur yang memanggil Server Functions seperti notifikasi, daftar LPD, master data, dan buat SPT.
   - Pastikan tidak ada error `Unauthorized: No authorization header provided` dan role tetap Admin/Petugas sesuai data `master_user`.