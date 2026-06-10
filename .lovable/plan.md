
## Tujuan

Mengubah layout dashboard agar menampilkan **kartu kapasitas Supabase** di sisi kanan, di samping tabel "LPD Terbaru" yang diperkecil.

## Layout baru

```text
[ Total LPD ] [ Menunggu ] [ Selesai ] [ Dibatalkan ]   (tetap, baris 1)

┌──────────────────────────────────────────┐  ┌──────────────────────┐
│  LPD Terbaru (kolom: No. Surat / Jenis / │  │  Kapasitas Supabase  │
│  Tempat / Tanggal / Status)              │  │  (Admin only)        │
│  diperkecil → lg:col-span-2              │  │  lg:col-span-1       │
│                                          │  │  • Database  ▓▓░░ %  │
│                                          │  │  • Storage   ▓▓▓░ %  │
│                                          │  │  • Egress    ▓░░░ %  │
└──────────────────────────────────────────┘  └──────────────────────┘
```

Grid: `lg:grid-cols-3` — LPD Terbaru `lg:col-span-2`, kartu Kapasitas `lg:col-span-1`. Di mobile/tablet menumpuk vertikal.

## Komponen baru

**`src/components/dashboard/capacity-card.tsx`**
- Kartu styling sama dengan card lain (`bg-card rounded-xl border border-outline-variant shadow-card`).
- Header: ikon `database`, judul "Kapasitas Supabase", subtitle "Free Tier".
- 3 baris progress vertikal (`CapacityRow`), tiap baris:
  - Label kiri (Database / Storage / Egress bulan ini)
  - Angka kanan: `120 MB / 500 MB · 24%`
  - Progress bar full-width, warna dinamis:
    - hijau `bg-status-selesai` jika `< 70%`
    - kuning `bg-status-menunggu` jika `>= 70%`
    - merah `bg-status-batal` jika `>= 90%`
  - Saat loading: skeleton bar abu.
  - Saat error: badge "—" + tooltip pesan error.
- Footer kecil: "Diperbarui {time}" dari `dataUpdatedAt`.

## Data layer

**File baru `src/lib/capacity.functions.ts`** — satu server fn Admin-only:

```ts
getSupabaseCapacity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // 1. Cek role Admin via has_role; kalau bukan → throw 403
    // 2. Jalankan 3 sumber paralel dengan Promise.allSettled
    //    a) Database size  → supabaseAdmin.rpc('get_db_size')
    //    b) Storage size   → SUM(metadata->>'size') dari storage.objects (semua bucket)
    //    c) Egress         → fetch Management API
    // 3. Mapping ke { used, limit, status: 'ok'|'error', error? }
    return { database, storage, egress, fetched_at }
  })
```

### Migration (1 file)

Buat 2 RPC `SECURITY DEFINER` (service_role saja tidak cukup karena admin client tetap pakai RPC untuk konsistensi):

- `public.get_db_size() RETURNS bigint` → `pg_database_size(current_database())`
- `public.get_storage_size() RETURNS bigint` → `SELECT COALESCE(SUM((metadata->>'size')::bigint),0) FROM storage.objects`

Keduanya `REVOKE ALL FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role`. Hanya dipanggil dari admin client.

### Egress via Management API

- Endpoint: `GET https://api.supabase.com/v1/projects/{ref}/usage` (baca field `egress`/`db_egress`/`storage_egress` — handler menjumlahkan field egress yang relevan untuk bulan berjalan).
- Header: `Authorization: Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`.
- `ref` dari `process.env.SUPABASE_PROJECT_ID` (sudah ada).
- Bila secret kosong / API gagal → kembalikan `{ status: 'error', error: 'Token belum diatur' }` agar UI menampilkan placeholder, tidak menggagalkan kartu lain.

## Integrasi ke dashboard

`src/routes/_authenticated/dashboard.tsx`:
- Ubah section bawah jadi grid `lg:grid-cols-3 gap-6`.
- `<section className="lg:col-span-2">…LPD Terbaru…</section>`
- `{me?.role_user === "Admin" && <CapacityCard />}` di `lg:col-span-1`.
- `CapacityCard` pakai `useQuery({ queryKey: ['capacity'], queryFn: fetchCapacity, enabled: isAdmin, staleTime: 5*60*1000 })`.

## Konstanta limit Free Tier (di `capacity-card.tsx`)

```ts
const LIMITS = {
  database: 500 * 1024 * 1024,        // 500 MB
  storage:  1024 * 1024 * 1024,       // 1 GB
  egress:   5 * 1024 * 1024 * 1024,   // 5 GB / bulan
};
const THRESHOLD = { warn: 0.70, danger: 0.90 };
```

## Secret yang dibutuhkan

`SUPABASE_ACCESS_TOKEN` — Personal Access Token dari https://supabase.com/dashboard/account/tokens. Akan diminta via `add_secret` setelah plan disetujui. Sampai secret diisi, bar Egress menampilkan status error informatif; Database & Storage tetap jalan.

## File yang berubah

- **Baru**: `src/components/dashboard/capacity-card.tsx`, `src/lib/capacity.functions.ts`, 1 migration SQL (2 RPC functions).
- **Diubah**: `src/routes/_authenticated/dashboard.tsx` (layout grid + render kartu).

## Yang tidak diubah

- Empat kartu statistik baris atas.
- Kolom & data tabel "LPD Terbaru" (hanya lebarnya menyempit jadi 2/3 grid).
- Sidebar, header, halaman lain.
