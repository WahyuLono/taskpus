## Masalah

Di custom domain (`taskpus.lovable.app`), sebagian panggilan server function masuk ke peladen **tanpa** header `Authorization: Bearer <token>`, sehingga `requireSupabaseAuth` menolak / role dianggap non-admin. Preview jarang kena karena timing hydration berbeda.

Penyebab pada `src/integrations/supabase/auth-attacher.ts`:

```ts
const { data } = await supabase.auth.getSession()
const token = data.session?.access_token
return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} })
```

Tiga celah:
1. `getSession()` hanya membaca cache in-memory / localStorage. Saat token **sudah expired** (umum di produksi karena tab lama), `access_token` masih ada tapi ditolak server → user "kehilangan" role.
2. Kalau `getSession()` return `null` (race saat awal load / storage belum siap), header sengaja **dikosongkan** → request jalan sebagai anon.
3. Tidak ada retry / refresh sebelum request dikirim.

## Perbaikan

Perbarui **hanya** `src/integrations/supabase/auth-attacher.ts` agar selalu mengirim token yang valid:

1. Panggil `supabase.auth.getSession()`.
2. Jika `expires_at` sudah lewat / < 60 detik lagi kedaluwarsa → panggil `supabase.auth.refreshSession()` dan pakai token hasil refresh.
3. Jika masih tidak ada token setelah refresh, coba `getSession()` sekali lagi (menangani race saat hydration di custom domain).
4. Kirim `Authorization: Bearer <token>` bila ada; jika benar-benar tidak ada sesi, biarkan kosong (memang guest).

Tidak mengubah `start.ts` (middleware sudah terdaftar), tidak mengubah `requireSupabaseAuth`, tidak mengubah komponen. Ini murni memperkuat sisi klien agar token yang dikirim selalu segar dan tidak hilang karena race.

## Verifikasi

- Buka `/dashboard` di custom domain sebagai Admin → menu Master & tombol "Edit SPT" tetap muncul setelah reload keras.
- Biarkan tab idle > 1 jam lalu klik menu → tidak ada "Forbidden: hanya Admin" karena token akan di-refresh otomatis sebelum request.
- Login sebagai Petugas → tidak muncul menu Admin (perilaku lama tetap benar).