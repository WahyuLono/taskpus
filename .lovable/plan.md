## Masalah

Saat Admin membuka menu Data Master, ia ditolak dan dipantulkan ke dashboard dengan toast "Halaman ini hanya untuk Admin", padahal role di tabel `master_user` sudah `Admin`.

Penyebabnya bukan RLS atau data — melainkan bug pada hook guard `useRequireAdmin`:

- `useCurrentUser()` memakai `useQuery({ enabled: ready && !!userId })`.
- Saat halaman pertama kali render, Supabase session belum siap (`ready=false`), jadi query **belum dijalankan**.
- Pada TanStack Query v5, query yang `enabled=false` punya `isLoading === false` (bukan `true`). Akibatnya hook langsung melewati cek `if (isLoading) return` dan menyimpulkan user bukan Admin → redirect.

## Perbaikan

### 1. `src/hooks/use-require-admin.ts`
Gunakan sinyal kesiapan yang akurat — bukan hanya `isLoading`:
- Tunggu `ready` (session bootstrap selesai) dari `useCurrentUser`.
- Jika `ready && !userId` → user belum login → biarkan layout `_authenticated` yang menangani redirect ke `/login` (jangan toast "bukan Admin").
- Jika `ready && userId` tapi query masih `isPending/isFetching` → tunggu.
- Setelah query selesai dan `me` ada → baru evaluasi `role_user !== "Admin"` dan redirect dengan toast.

Pseudokode:
```ts
const { data: me, ready, userId, isFetching, isSuccess } = useCurrentUser();

useEffect(() => {
  if (!ready) return;                  // session belum siap
  if (!userId) return;                  // bukan masalah admin, biar layout auth handle
  if (isFetching || !isSuccess) return; // profil belum termuat
  if (!me || me.role_user !== "Admin") {
    toast.error("Halaman ini hanya untuk Admin");
    navigate({ to: "/dashboard" });
  }
}, [ready, userId, isFetching, isSuccess, me]);

return {
  isAdmin: me?.role_user === "Admin",
  isLoading: !ready || (!!userId && (isFetching || !isSuccess)),
};
```

### 2. Tidak ada perubahan lain
- Tidak menyentuh `useCurrentUser`, server function `getCurrentUser`, RLS, atau halaman master.
- Komponen `MasterIndex` dkk. sudah benar: `if (isLoading || !isAdmin) return null;` — akan otomatis berperilaku benar setelah `isLoading` melaporkan status sebenarnya.

## Verifikasi

1. Login sebagai admin (NIP `admin` / `admin123`) → klik "Data Master" → halaman 4 kartu tampil tanpa toast/redirect.
2. Login sebagai user non-admin → buka `/master` langsung via URL → toast "Hanya untuk Admin" + redirect ke `/dashboard`.
3. Akses `/master` saat belum login → redirect ke `/login` (oleh layout `_authenticated`), bukan ke `/dashboard`.
