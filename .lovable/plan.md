## Rencana Perbaikan

1. **Pulihkan agar render tidak bisa dijatuhkan oleh notifikasi**
  - Ubah `NotificationBell` supaya query `countUnreadNotifikasi` dan `listNotifikasi` hanya aktif jika session benar-benar siap dan ada user.
  - Tambahkan handling error lokal pada query notifikasi: jika server function mengembalikan `Unauthorized`, lonceng tidak melempar error ke React tree; badge cukup dianggap `0` dan dropdown menampilkan state aman.
2. **Perbaiki mekanisme attachment token Supabase**
  - Tinjau `attachSupabaseAuth` agar aman di semua fase TanStack Start, terutama saat callback `.client()` berjalan sebelum browser/session siap.
  - Pastikan akses ke Supabase/localStorage tidak menyebabkan exception yang tidak tertangkap.
  - Jika token belum tersedia, server function protected tidak dipanggil dari komponen yang belum siap, bukan dipanggil tanpa header.
3. **Perbaiki middleware server agar Unauthorized tidak memicu blank screen**
  - Sesuaikan `requireSupabaseAuth` agar error auth dilempar sebagai `Response` 401 yang terkontrol, bukan `Error` biasa yang dapat terangkat menjadi runtime crash di UI.
  - Pertahankan validasi ketat: tanpa bearer token tetap ditolak, tetapi tidak merusak render seluruh aplikasi.
4. **Rapikan import server-only yang berisiko**
  - Di `src/lib/me.functions.ts`, ada import `supabaseAdmin` di module scope pada file server function. Ini tidak ideal untuk TanStack Start dan bisa memperbesar risiko runtime/bundle issue.
  - Pindahkan import admin client ke dalam handler yang memang memerlukannya, sesuai pola aman server function.
5. **Validasi setelah implementasi**
  - Buka halaman `/dashboard` dan `/lpd` di preview.
  - Pastikan tidak blank screen.
  - Pastikan request `getCurrentUser`, `listLpd`, dan notifikasi membawa header Authorization ketika session ada.
  - Pastikan jika session belum siap/expired, aplikasi tetap render dan diarahkan/login secara normal, bukan crash.

Rencana perbaikan yang sangat bagus dan komprehensif. Silakan eksekusi seluruh 5 poin rencana tersebut sekarang juga. Pastikan UI merespons dengan aman (graceful) dan tidak ada lagi unhandled exception yang membuat layar menjadi blank putih.