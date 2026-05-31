# Edit SPT (Admin only)

## Tujuan

Saat ini setelah Admin membuat SPT di `/lpd/baru`, metadata surat (tanggal, jenis, dalam rangka, tempat, kepala penandatangan, daftar petugas) tidak bisa diubah lagi — hanya bisa dilihat di halaman detail. Tambah kemampuan **Admin** untuk mengedit data SPT tersebut.

Catatan penting:

- `**no_surat` / `no_surat_slug` TIDAK diubah** — sudah ter-allocate dari `nomor_surat_allocation`, mengubahnya akan merusak konsistensi nomor + path storage.
- Field yang bisa diedit: `tgl_buat`, `tgl_kegiatan`, `tgl_selesai`, `jenis_perjadin`, `id_rangka`, `id_tempat`, `id_kepala`, dan daftar `petugas_ids`. `lama_hari` dihitung ulang otomatis dari rentang tanggal.
- Field laporan hasil kegiatan (`input_alat`, `output`, `url_foto`, dll) **tidak disentuh** — itu tetap milik alur petugas/approval.
- Akses dibatasi role **Admin** di tiga lapisan: UI (tombol tersembunyi), server function (cek `has_role`), dan RLS yang sudah ada (`Admins update lpd`).

## Perubahan

### 1. Database function baru (migration)

RPC `update_lpd_spt(p_id_lpd, p_tgl_buat, p_tgl_kegiatan, p_tgl_selesai, p_jenis_perjadin, p_id_rangka, p_id_tempat, p_id_kepala, p_petugas_ids)`:

- `SECURITY DEFINER`, cek `has_role(auth.uid(), 'Admin')` → kalau bukan admin RAISE EXCEPTION.
- UPDATE `transaksi_lpd` field metadata + hitung ulang `lama_hari = (tgl_selesai - tgl_kegiatan) + 1` + set `updated_at = now()`.
- Sinkronkan `detail_petugas`: DELETE semua baris untuk `id_lpd`, INSERT ulang dari array `p_petugas_ids` (cara paling sederhana & aman).
- Tidak mengubah `no_surat`, `no_surat_slug`, status, atau field laporan.

### 2. Server function baru

`updateLpdSpt` di `src/lib/lpd.functions.ts`:

- `createServerFn({ method: "POST" })` + `requireSupabaseAuth`.
- Zod schema sama seperti `CreateLpdSchema` + tambahan `id: uuid`.
- Panggil RPC di atas, return `{ ok: true }`.

### 3. Route edit baru

`src/routes/_authenticated/lpd.$id.edit.tsx`:

- Akses Admin-only: kalau bukan Admin tampilkan "Akses ditolak" (pola sama dengan `lpd.baru.tsx`).
- Form **identik** dengan `lpd.baru.tsx` (rangka, tempat, kepala, petugas + tanggal & jenis), tapi:
  - Prefill dari `getLpdDetail` (sudah ada).
  - Tampilkan header read-only: nomor surat + status saat ini.
  - Tombol submit = "Simpan Perubahan", panggil `updateLpdSpt`.
  - Setelah sukses → toast + navigate balik ke `/lpd/$id`.
- Refactor kecil: pindahkan tiga helper `Section` / `Fld` / `Row` / `QuickSelect` dari `lpd.baru.tsx` ke `src/components/lpd/spt-form-bits.tsx` lalu import dari kedua route (hindari duplikasi).

### 4. Tombol "Edit SPT" di halaman detail

Di `src/routes/_authenticated/lpd.$id.tsx`, tambah tombol kecil di header detail SPT, tampil **hanya jika `isAdmin**`, link ke `/lpd/$id/edit`. Ditaruh dekat tombol Print / aksi admin lain biar konsisten.

## Pertanyaan untuk dikonfirmasi

Tidak ada — scope cukup jelas, ikuti pola yang sudah ada di `lpd.baru.tsx` dan `create_lpd_baru` RPC. Jika setelah review Anda ingin batasi edit hanya saat `approval_status IN ('Draft','Ditolak')` (mis. supaya tidak bisa diubah saat laporan sudah disetujui), tinggal ditambahkan satu cek di RPC — tapi default plan ini: **Admin selalu bisa edit metadata SPT**, sesuai permintaan Anda. Jawaban : betul ini membatasi hanya saat ada case admin sudah membuat spt pada buat spt. ternyata terjadi kesalahan. admin bisa edit. ini tidak menyentuh terkait laporan hasil pelaksanaan tugas. namun ketika petugas sudah mengisi laporan hasil pelaksanaan tugas dan menunggu approval admin. tombol edit ini sudah tidak bisa difungsikan atau maksud saya secara teknis sudah diyakini saat buat spt sudah benar.

## Detail teknis singkat

- **Migration**: 1 file, 1 fungsi `public.update_lpd_spt(...)` dengan `SET search_path = public`, `SECURITY DEFINER`.
- **Tidak ada perubahan schema/kolom**, tidak ada perubahan RLS (policy `Admin update lpd` sudah meng-cover UPDATE; `Admins insert/delete detail_petugas` sudah meng-cover sync petugas dari sisi RPC owner).
- **File**:
  - baru: `supabase/migrations/<ts>_update_lpd_spt.sql`
  - baru: `src/routes/_authenticated/lpd.$id.edit.tsx`
  - baru: `src/components/lpd/spt-form-bits.tsx`
  - edit: `src/lib/lpd.functions.ts` (tambah `updateLpdSpt`)
  - edit: `src/routes/_authenticated/lpd.baru.tsx` (pakai helper dari `spt-form-bits.tsx`)
  - edit: `src/routes/_authenticated/lpd.$id.tsx` (tombol "Edit SPT" admin-only)