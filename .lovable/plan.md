## Problem

Saat Admin mengklik tombol Cetak, route `/print/lpd/$id` terbuka di tab baru. Pesan "Akses ditolak — hanya Admin yang dapat mencetak Surat Tugas." langsung muncul, padahal user adalah Admin.

## Root Cause

Di `src/routes/print.lpd.$id.tsx`, guard menggunakan `isFetching` dari `useCurrentUser()`:

```ts
const { data: me, isFetching: meLoading } = useCurrentUser();
const isAdmin = me?.role_user === "Admin";
if (meLoading) return <p>Memuat…</p>;
if (!isAdmin) return <p>Akses ditolak…</p>;
```

`useCurrentUser` baru men-`enable` query setelah Supabase session siap (`enabled: ready && !!userId`). Selama Supabase masih merestorasi session dari `localStorage` di tab baru:
- `ready = false`, `userId = null`
- Query belum aktif, jadi `isFetching = false`
- `me = undefined`, `isAdmin = false`
- Kondisi langsung jatuh ke cabang "Akses ditolak"

Begitu session terhidrasi, komponen sudah selesai render pesan tolak (tidak ada re-trigger ke loading state).

## Fix

Tampilkan state "Memuat…" selama session belum siap **atau** profil belum termuat, baru evaluasi role.

Update guard di `src/routes/print.lpd.$id.tsx`:

```ts
const { data: me, isFetching: meLoading, ready, userId } = useCurrentUser();
const isAdmin = me?.role_user === "Admin";

// Tunggu sampai sesi Supabase ter-hydrate dan profil termuat
if (!ready || (userId && !me) || meLoading)
  return <p className="p-10 text-center text-gray-500">Memuat…</p>;

if (!isAdmin)
  return <p className="p-10 text-center text-red-600">
    Akses ditolak — hanya Admin yang dapat mencetak Surat Tugas.
  </p>;
```

Tidak ada perubahan pada layout dokumen, query data LPD, atau logika cetak lainnya. Tombol cetak di halaman LPD juga tidak diubah.
