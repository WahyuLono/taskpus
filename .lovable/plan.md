## Diagnosis

Klik "Edit SPT" memang tidak melakukan apa-apa — bukan karena `status_lpd`, tapi karena **konflik nested route**.

File `src/routes/_authenticated/lpd.$id.edit.tsx` (dot-notation) menjadi **child route** dari `lpd.$id.tsx`. Agar child bisa tampil, parent (`lpd.$id.tsx`) harus me-render `<Outlet />`. Saat ini parent tidak punya `<Outlet />` → URL berubah ke `/lpd/<id>/edit`, tapi yang ter-render tetap halaman detail. Visual: "tidak terjadi apa-apa".

Analogi Anda soal `status_lpd` + `approval_status` benar dan akan kita pakai sebagai aturan baku untuk eligibility edit — tapi itu masalah terpisah dari bug klik di atas. Dua-duanya saya selesaikan dalam plan ini.

## Perubahan

### 1. Fix routing — pisahkan edit dari parent detail

Rename file route dengan trailing underscore agar tidak nested di bawah `lpd.$id`:

- `src/routes/_authenticated/lpd.$id.edit.tsx` → `src/routes/_authenticated/lpd.$id_.edit.tsx`

Dalam TanStack Router, trailing `_` ("escape") menghasilkan path yang sama (`/lpd/$id/edit`) tapi route tidak nested di bawah `lpd.$id`. `routeTree.gen.ts` akan otomatis di-regenerate. Tidak perlu sentuh `lpd.$id.tsx`.

Update `createFileRoute` di file edit jadi `"/_authenticated/lpd/$id_/edit"`.

### 2. Aturan baru "boleh edit SPT" — pakai analogi Anda

Hanya bisa edit jika **`status_lpd = 'Belum'` DAN `approval_status = 'Draft'`**. Selain itu tombol disembunyikan dan RPC menolak.

Alasan: ini mencakup kasus admin baru saja membuat SPT dan belum ada aktivitas dari petugas. Begitu petugas mulai (status_lpd berubah jadi `Sudah`, atau approval naik ke `Menunggu`/`Disetujui`/`Ditolak`), edit langsung terkunci. Konsisten di tiga lapis: UI, halaman edit, RPC.

**a. UI tombol di `src/routes/_authenticated/lpd.$id.tsx`**

Ganti kondisi tampil tombol "Edit SPT":

```tsx
const canEditSpt =
  isAdmin && lpd.status_lpd === "Belum" && lpd.approval_status === "Draft";
// ...
{canEditSpt && (
  <Link to="/lpd/$id/edit" params={{ id }} ...>Edit SPT</Link>
)}
```

**b. Halaman edit `lpd.$id_.edit.tsx`**

Ganti variabel `locked` jadi:

```tsx
const canEdit = lpd?.status_lpd === "Belum" && lpd?.approval_status === "Draft";
```

Lock screen baru menampilkan alasan dinamis: kalau `approval_status` selain `Draft` → "laporan sudah {approval}", kalau `status_lpd` selain `Belum` → "status surat sudah {status}".

Sekalian benerin **hooks order bug** kecil: `useMemo(filteredPetugas, ...)` saat ini berada **setelah** early return (`if (detail.isLoading) return ...`). Pindahkan `useMemo` ke atas sebelum semua early return agar urutan hook konsisten antar render (mencegah crash "Rendered more hooks than during the previous render" yang juga bisa bikin halaman blank).

**c. RPC `public.update_lpd_spt` (migration baru)**

Ganti guard:

```sql
IF v_row.approval_status <> 'Draft'::public.approval_status_lpd
   OR v_row.status_lpd <> 'Belum'::public.status_surat THEN
  RAISE EXCEPTION 'SPT tidak bisa diedit. Syarat: status_lpd=Belum & approval_status=Draft (saat ini: %, %).',
    v_row.status_lpd, v_row.approval_status;
END IF;
```

Sisanya tetap (hanya update metadata, sync `detail_petugas`, tidak menyentuh `no_surat`/laporan).

## File yang berubah

- rename: `src/routes/_authenticated/lpd.$id.edit.tsx` → `lpd.$id_.edit.tsx` (path baru + tweak `createFileRoute` + ganti `locked`→`canEdit` + pindahkan `useMemo`)
- edit: `src/routes/_authenticated/lpd.$id.tsx` (kondisi tombol pakai `status_lpd === 'Belum' && approval_status === 'Draft'`)
- baru: `supabase/migrations/<ts>_update_lpd_spt_strict.sql` (CREATE OR REPLACE FUNCTION `update_lpd_spt` dengan guard baru)

Tidak ada perubahan RLS, schema, atau server function TS (skema Zod tetap).
