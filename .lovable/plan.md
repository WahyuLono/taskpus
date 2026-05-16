
# Rencana Pembangunan TASKPUS

Aplikasi ini cukup besar (auth NIP, RBAC Admin/Petugas, 6 modul). Saya usulkan **bangun bertahap**. Iterasi pertama mencakup pondasi + modul yang paling kritikal agar bisa langsung dipakai end-to-end, sisanya menyusul.

## Fase 1 — Pondasi (iterasi ini)

### 1. Design System (DESIGN.md → styles.css)
- Konversi seluruh token warna DESIGN.md ke `src/styles.css` sebagai CSS variables `oklch`/`hex` di `:root`, lalu daftarkan di `@theme inline` agar muncul sebagai Tailwind utilities (`bg-primary`, `bg-surface-container`, `text-on-surface`, dst).
- Mapping shadcn tokens: `--background`→surface, `--foreground`→on-surface, `--primary`→#0052CC, `--secondary`→purple, `--destructive`→error, `--muted`→surface-container-low, `--border`→outline-variant.
- Tambah token kustom: `--surface-container*`, `--on-surface-variant`, `--outline`, `--secondary-container`, `--tertiary*`, status badge (asn/non-asn/kepala/menunggu/selesai/batal).
- Font: import Inter + Material Symbols Outlined via `<link>` di `__root.tsx`, set `font-family` body ke Inter.
- Radius: `--radius: 0.5rem` (8px) sesuai DESIGN.
- Shadow tokens: `--shadow-card`, `--shadow-floating`.
- Catatan: project ini pakai Tailwind v4 lewat `src/styles.css`, **tidak ada `tailwind.config.ts`**. Semua token diletakkan di `styles.css` (sesuai konvensi stack).

### 2. Auth NIP-based
- `/login`: input NIP + password. Saat submit, mapping `email = ${nip}@lpd.internal` lalu `supabase.auth.signInWithPassword`.
- `onAuthStateChange` listener di `__root.tsx` + invalidate router/query.
- Route group `_authenticated.tsx` dengan `beforeLoad` redirect ke `/login` jika belum login; ambil profil dari `master_user` (role + nama + is_kepala_uptd) lalu expose via context.
- Hook `useCurrentUser()` untuk akses role/profile.

### 3. App Shell
- Layout `_authenticated.tsx`: Sidebar 260px (fixed) + Header 72px + content area dengan padding 24px.
- Sidebar: menu dinamis sesuai role (Admin lihat semua, Petugas hanya Tugas Saya + Pelaporan).
- Header: judul halaman, search global (placeholder UI), profile dropdown dengan badge role, tombol logout.
- Pakai komposisi dari `master_data_management.html`, `admin_dashboard_analytics.html`, `tugas_saya_pelaporan.html` sebagai referensi struktur DOM.

### 4. Modul Operasional Inti
- **Dashboard Admin** (`/`): kartu statistik (total LPD, status), tabel LPD terbaru — referensi `admin_dashboard_analytics.html`.
- **Daftar LPD** (`/lpd`): tabel + filter status + detail drawer — referensi `data_lpd_detail_view.html`.
- **Buat SPT** (`/lpd/baru`): form dengan Searchable Select (Rangka, Tempat, Kepala UPTD difilter `is_kepala_uptd=true`, Petugas multi-select). Submit memanggil RPC `create_lpd_baru`. Quick Add untuk Rangka/Tempat (admin). Referensi `buat_surat_tugas_spt.html`.
- **Tugas Saya** (`/tugas`): daftar LPD yang ditugaskan ke user login + tombol upload laporan & cetak. Referensi `tugas_saya_pelaporan.html`.

### 5. Server functions (`createServerFn` + `requireSupabaseAuth`)
- `getDashboardStats`, `listLpd(filter)`, `getLpdDetail(id)`, `createLpd(input)` (panggil RPC), `listMyTasks()`, `uploadLaporan(id, file)`, `updateLpdStatus`.
- Master: `listGolongan/Rangka/Tempat/UserPetugas/UserKepala`, `addRangka/Tempat` (admin only).

## Fase 2 — Modul Lanjutan (iterasi berikutnya)
- **Master Data CRUD** lengkap (Golongan, Rangka, Tempat, User Pegawai) — UI tabel + dialog.
- **Pengaturan Sistem** (settings_config singleton): template no surat + matrix akses petugas (toggle iOS).
- **Halaman Cetak SPT** (`/cetak/spt/$id`): route tanpa sidebar/header, layout print-friendly, helper `angkaTerbilang()`, dasar hukum hardcoded, blok tanda tangan dari relasi kepala.
- **Upload Laporan**: kompresi via `browser-image-compression` (1 foto/LPD, max 1MB), upload ke `laporan_lpd/[TAHUN]/[BULAN]/[NO_SURAT_SLUG]/`.
- **Soft delete / Batal LPD** + audit timestamp.
- Polish: skeleton loaders, empty states, toast notifications.

## Catatan Teknis
- Pakai Supabase client browser untuk session/realtime; semua read/write data via `createServerFn` + `requireSupabaseAuth` (RLS sudah aktif di DB).
- RPC `create_lpd_baru` dipanggil melalui `supabase.rpc('create_lpd_baru', {...})` di dalam server function.
- File `src/integrations/supabase/types.ts` sudah ada (auto-generated) — tidak diedit.
- Tidak buat Edge Function.
- TanStack file-based routing di `src/routes/`. Struktur:
  ```
  src/routes/
    __root.tsx
    index.tsx                  (redirect ke /dashboard atau /login)
    login.tsx
    _authenticated.tsx         (layout sidebar+header, guard)
    _authenticated/
      dashboard.tsx
      lpd.index.tsx
      lpd.baru.tsx
      lpd.$id.tsx
      tugas.tsx
      master.golongan.tsx      (fase 2)
      master.rangka.tsx        (fase 2)
      master.tempat.tsx        (fase 2)
      master.user.tsx          (fase 2)
      pengaturan.tsx           (fase 2)
    cetak.spt.$id.tsx          (fase 2 — no layout)
  ```

## Konfirmasi sebelum eksekusi
1. Setujui scope Fase 1 di atas? Atau ingin saya kerjakan **semua sekaligus** (lebih lama, lebih besar risikonya)?
2. Login mockup tidak disediakan — saya akan buat halaman login minimal sesuai DESIGN.md (card di tengah, primary blue, input NIP+password). OK?
3. Saat ini belum ada user di `auth.users`. Anda perlu buat user admin pertama lewat Supabase dashboard + insert baris di `master_user` (saya akan jelaskan langkahnya setelah implementasi).
