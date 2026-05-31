# Evaluasi Pagination — Status Saat Ini

Saya sudah menelusuri semua halaman daftar di web app. **Belum ada satupun pagination yang terimplementasi**. Komponen `src/components/ui/pagination.tsx` (shadcn) sudah tersedia tetapi tidak dipakai di manapun.

Ringkasan kondisi per halaman:


| Halaman                                  | Format                     | Batas saat ini                    | Pagination                               |
| ---------------------------------------- | -------------------------- | --------------------------------- | ---------------------------------------- |
| `/dashboard` → LPD Terbaru               | Tabel                      | `limit: 8` (hardcoded)            | Tidak — memang ringkasan saja            |
| `/lpd` (Daftar LPD)                      | Tabel                      | `limit: 100` (hardcoded)          | Tidak — akan bermasalah saat data tumbuh |
| `/tugas`                                 | **Card** (grid 2–3 kolom)  | Semua data ditarik                | Tidak                                    |
| `/master/golongan`, `/rangka`, `/tempat` | Tabel via `SimpleNameCrud` | Semua ditarik, filter client-side | Tidak                                    |
| `/master/user`                           | (perlu pagination juga)    | Semua ditarik                     | Tidak                                    |
| `/master/nomor-surat`                    | (perlu pagination juga)    | Semua ditarik                     | Tidak                                    |


# Rekomendasi Saya

**1. Dashboard "LPD Terbaru" → JANGAN diberi pagination.**
Ini adalah widget ringkasan. Biarkan `limit: 8` dan link "Lihat semua →" yang sudah ada — itulah pola yang benar untuk dashboard. Menambahkan pagination di sini akan mengaburkan fungsinya.

**2. `/lpd` dan `/tugas` → Pagination server-side.**
Data LPD akan terus bertambah setiap bulan/tahun. Client-side pagination (tarik semua lalu potong di browser) akan melambat. Lebih baik:

- Tambah `page` + `pageSize` ke `listLpd` dan `listMyTasks` (server function), dengan `count: 'exact'` dari Supabase agar tahu total halaman.
- Default `pageSize = 12` (kelipatan 2 dan 3 → rapi di grid card 2/3 kolom).
- Simpan `page` di URL search params (`?page=2`) supaya bisa di-bookmark, share, dan tahan refresh — pakai `validateSearch` TanStack Router.

**3. `/master/*` → Pagination client-side cukup.**
Master data (golongan/rangka/tempat/user/nomor-surat) jumlahnya kecil dan jarang berubah. Pagination cukup di sisi client setelah filter — tidak perlu ubah server function. Default `pageSize = 10`.

**4. Soal format Card vs Tabel.**
Anda menyebut suka format card seperti di `/tugas`. Tapi `/lpd` saat ini masih **tabel**, bukan card. Jika Anda mau, saya bisa sekalian ubah `/lpd` ke format card seperti `/tugas` (lebih ramah mobile, lebih scannable). Lihat pertanyaan di akhir.

**5. Komponen pagination dipakai bersama.**
Buat satu `PaginationBar` reusable (pakai shadcn `Pagination` yang sudah ada) dengan props `{ page, totalPages, onChange }`. Pakai di semua halaman yang butuh.

# Rencana Implementasi

## A. Server functions (`src/lib/lpd.functions.ts`)

- `listLpd`: tambah input `page` (default 1) dan `pageSize` (default 12). Gunakan `.range(from, to)` + `.select('*', { count: 'exact' })`. Return `{ rows, total, page, pageSize }`.
- `listMyTasks`: pola yang sama, default `pageSize = 12`.
- Dashboard `recent` tetap pakai mode lama (`limit: 8`) — tidak diubah.

## B. Komponen reusable

- `src/components/ui/pagination-bar.tsx` — wrapper di atas shadcn `Pagination` dengan logika halaman (Prev/1…/active/…/Last/Next + ellipsis) + info "Menampilkan X–Y dari Z".

## C. `/lpd` (`src/routes/_authenticated/lpd.index.tsx`)

- Tambah `validateSearch` (zod): `{ page?: number, status?: 'all'|'Belum'|'Sudah'|'Batal', q?: string }`.
- Ganti `useState` filter+search menjadi URL search params (`Route.useSearch()` + `useNavigate`).
- Reset ke `page=1` ketika filter/search berubah.
- Tampilkan `PaginationBar` di bawah daftar.
- (Opsional, lihat pertanyaan) ubah ke format card.

## D. `/tugas` (`src/routes/_authenticated/tugas.tsx`)

- Sudah card. Tambah `page` di URL search params, panggil `listMyTasks` dengan `page`/`pageSize`, render `PaginationBar`.

## E. `/master/golongan`, `/master/rangka`, `/master/tempat` (`SimpleNameCrud`)

- Tambah state `page` (local) di `SimpleNameCrud`.
- Potong `filtered` jadi `paginated` (`slice((page-1)*size, page*size)`).
- Reset `page` ke 1 saat `search` berubah.
- Render `PaginationBar` di bawah tabel.

## F. `/master/user` dan `/master/nomor-surat`

- Pola yang sama dengan E (client-side pagination atas hasil filter), default `pageSize = 10`.

# Yang Tidak Akan Disentuh

- `/dashboard` LPD Terbaru — tetap 8 item tanpa pagination.
- Logika auth/RLS/CRUD — tidak diubah.
- Format tabel master akan dipertahankan (cocok untuk admin yang perlu skim cepat banyak data).

# Pertanyaan untuk Anda Sebelum Saya Mulai

1. **Apakah `/lpd` ingin diubah ke format card** seperti `/tugas` (sesuai preferensi Anda), atau tetap tabel + tambahkan pagination saja? tetap tabel + tambah pagination.
2. **Default** `pageSize`: setuju 12 untuk daftar LPD/tugas dan 10 untuk master? Atau Anda ingin angka lain? setuju.
3. **Simpan page di URL** (`?page=2`)? Saya rekomendasi ya, supaya bisa di-share dan tahan refresh.