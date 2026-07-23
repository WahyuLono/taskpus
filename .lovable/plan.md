## Masalah

Login sebagai `admin` (email `admin@lpd.internal`, id `969e808c…`) sukses dan server function `getCurrentUser` mengembalikan `role_user = "Admin"` dengan benar (dicek langsung di network log 07:09:08Z). RLS `master_user` juga sudah membolehkan user membaca baris miliknya sendiri (`auth.uid() = id_user`) — jadi bukan masalah role check maupun RLS.

Namun UI menampilkan dashboard "pengguna biasa" (header "Pengguna", tanpa tombol "Buat SPT Baru", sidebar tanpa menu admin, kartu Kapasitas tidak muncul). Ini terjadi karena `me` di komponen bernilai `undefined` pada saat render — masalah **cache & race di TanStack Query**, bukan di database.

## Akar Masalah

`useSession` (di `src/hooks/use-current-user.ts`) mulai dengan `userId = null`, lalu baru mengisi lewat `useEffect`. `useCurrentUser` memakai `["current-user", userId]` sebagai key — jadi query yang pertama kali dibuat memakai key `["current-user", null]` dan `enabled: false`. Ketika session muncul, query key berpindah ke `["current-user", <adminId>]`, tapi:

- Tidak ada listener `onAuthStateChange` di root yang memanggil `queryClient.invalidateQueries()` — sisa cache dari sesi lama (mis. `ais@lpd.internal`) bisa tersaji sekejap.
- `getSession()` yang dipakai `useSession` dan `_authenticated`'s `beforeLoad` kadang mengembalikan session lama sebelum sinkron; sebaiknya pakai `getUser()` untuk identitas.
- `useSession`/`useCurrentUser` tidak menyediakan flag "profile siap" ke komponen, jadi UI merender fallback ("Pengguna") sebagai kondisi normal alih-alih skeleton.

## Solusi

Perbaikan murni di frontend/hook (tidak ada perubahan schema, RPC, atau RLS — sudah benar):

1. `**src/hooks/use-current-user.ts**`
  - Ekspor status `isReady` gabungan: `sessionReady && (query.isSuccess || query.isError)`.
  - Ganti `supabase.auth.getSession()` menjadi `getUser()` di dalam `useSession()` untuk memastikan identitas yang divalidasi server (fallback ke `getSession()` bila offline).
  - Tetap invalidate query saat `onAuthStateChange` mengeluarkan `SIGNED_IN`/`SIGNED_OUT`/`USER_UPDATED` (untuk hook lokal).
2. `**src/routes/__root.tsx**` — tambah satu listener global `onAuthStateChange`:
  - Pada `SIGNED_IN` / `USER_UPDATED`: `queryClient.invalidateQueries({ queryKey: ["current-user"] })` + `router.invalidate()`.
  - Pada `SIGNED_OUT`: `queryClient.removeQueries({ queryKey: ["current-user"] })` supaya profil lama tidak menempel di sesi baru.
  - Filter event agar tidak refetch di `TOKEN_REFRESHED` / `INITIAL_SESSION` (mencegah storm).
3. `**src/routes/login.tsx**` — setelah `signInWithPassword` sukses, panggil `queryClient.invalidateQueries({ queryKey: ["current-user"] })` sebelum `navigate({ to: "/dashboard" })`, supaya dashboard mendapat data segar sejak render pertama.
4. `**src/routes/_authenticated/dashboard.tsx` & `src/routes/_authenticated.tsx**` — tampilkan skeleton/placeholder saat `!isReady` (bukan langsung fallback "Pengguna" & sidebar non-admin). Hindari flash of non-admin UI.

## Verifikasi

- Hard-refresh sebagai `admin` → header langsung "Administrator", sidebar berisi "Buat SPT" & "Data Master", tombol "Buat SPT Baru" muncul, kartu "Kapasitas Supabase" tampil.
- Logout → login sebagai petugas (mis. `ais`) → UI non-admin, tidak ada bocor menu admin.
- Logout dari petugas → login sebagai `admin` di tab yang sama tanpa refresh → UI langsung admin (bukti cache berhasil di-invalidate).
- Buka `/master` & `/lpd/baru` sebagai admin → tidak ada redirect "Halaman ini hanya untuk Admin".

Tidak ada migrasi DB, tidak ada perubahan pada RLS `master_user`, dan tidak ada perubahan pada `getCurrentUser` server function.

Jawaban saya : Tolong terapkan seluruh 4 solusi perbaikan frontend dan TanStack Query tersebut sekarang.