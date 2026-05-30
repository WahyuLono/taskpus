## Tujuan

Mengganti generator nomor surat saat ini (auto increment global per tahun: `max(...)+1`) menjadi mekanisme **quota allocation** sesuai PRD v9 R1. Admin mengelola jatah nomor (range) per tahun di menu Master Data baru "Setting Nomor Surat". Saat Admin membuat SPT, sistem tetap auto-pick nomor berikutnya — tapi diambil dari jatah aktif, bukan murni urut bebas.

Scope dibatasi: HANYA penomoran surat. Tidak menyentuh modul lain (LPD form, laporan, cetak ST, role, dsb), kecuali penyesuaian RPC `create_lpd_baru` yang memang harus membaca dari tabel jatah.

## Keputusan (sesuai jawaban user)

- Scope quota: **global per web app** (bukan per unit / per user).
- Format nomor: tetap pakai komponen tahun → `090/<NNN>/P.KI.<TAHUN>` (tidak berubah). Sequence berjalan dalam tahun; reset di tahun baru.
- Tahun berganti: otomatis tidak ada jatah aktif → wajib admin isi jatah baru.
- Audit trail: cukup `updated_at` standar, tidak perlu log perubahan terperinci.
- Petugas tidak terlibat (Buat SPT admin-only). Tidak perlu notifikasi ke admin.

## Perubahan Database (migration)

Tabel baru `nomor_surat_allocation`:

```text
id_allocation     SMALLINT  PK identity
tahun             SMALLINT  NOT NULL
range_start       SMALLINT  NOT NULL
range_end         SMALLINT  NOT NULL
last_used_number  SMALLINT  NOT NULL DEFAULT (range_start - 1)
status            TEXT      NOT NULL DEFAULT 'Active'  CHECK IN ('Active','Inactive')
created_at, updated_at
UNIQUE(tahun, range_start)
CHECK (range_end >= range_start)
CHECK (last_used_number BETWEEN range_start - 1 AND range_end)
```

GRANT + RLS:
- `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated; GRANT ALL TO service_role;`
- RLS enable. Policy: Admin full access (`has_role(auth.uid(),'Admin')`); Petugas SELECT saja (opsional, agar bisa dilihat). Tidak ada akses anon.

Fungsi `validate_allocation_range(p_tahun, p_start, p_end, p_exclude_id)` SECURITY DEFINER untuk cek overlap range antar jatah aktif pada tahun yang sama.

Ubah RPC `create_lpd_baru` (admin-only sudah). Ganti blok penomoran:

```text
1. Ambil 1 baris allocation aktif di tahun(p_tgl_buat) dengan FOR UPDATE,
   urut by range_start, yang masih punya sisa (last_used_number < range_end).
2. Jika tidak ada → RAISE 'Jatah nomor surat tahun % sudah habis. Hubungi administrator.'
3. v_nomor := last_used_number + 1 (atau range_start jika last_used_number < range_start)
4. UPDATE allocation SET last_used_number = v_nomor
5. Format no_surat / slug seperti sekarang.
```

Hapus dependensi `max(no_surat)` lama. Lock pakai `SELECT ... FOR UPDATE` pada baris allocation (cukup; advisory lock tidak diperlukan lagi).

Migration juga menyisipkan jatah awal untuk tahun berjalan berdasarkan data existing: `range_start=1, range_end=100, last_used_number = max(nomor saat ini di transaksi_lpd tahun ini, default 0)` agar tidak terjadi tabrakan dengan surat yang sudah ada.

## Perubahan Server Functions

File baru `src/lib/allocation.functions.ts` (admin-only via `has_role` check di handler, semua pakai `requireSupabaseAuth`):

- `listAllocations({ tahun? })` — list semua jatah, urut tahun desc + range_start.
- `createAllocation({ tahun, range_start, range_end })` — panggil `validate_allocation_range`, lalu insert (`last_used_number = range_start - 1`, status 'Active').
- `updateAllocation({ id, range_start, range_end, status })` — boleh edit jika `last_used_number` masih ≤ `range_end` baru dan ≥ `range_start - 1` baru; cek overlap.
- `deleteAllocation({ id })` — hanya jika `last_used_number < range_start` (belum dipakai).

Tidak ada perubahan signature `createLpd` di FE — error dari RPC ("Jatah habis…") akan langsung ditampilkan toast oleh form yang sudah ada.

## Perubahan UI (Master Data)

Tambah satu entri di `src/routes/_authenticated/master.index.tsx`:
- `to: "/master/nomor-surat"`, judul "Setting Nomor Surat", icon `confirmation_number`, deskripsi "Atur jatah & range nomor surat per tahun".

Route baru `src/routes/_authenticated/master.nomor-surat.tsx` (admin-only via `useRequireAdmin`):
- Filter tahun (default tahun berjalan, opsi semua).
- Tabel kolom: Tahun, Range (start–end), Terpakai (`last_used_number - range_start + 1` / `range_end - range_start + 1`), Sisa, Status, Aksi.
- Tombol "Tambah Jatah" → modal: tahun, range_start, range_end. Validasi: start ≥ 1, end ≥ start, anti-overlap (mengandalkan error RPC).
- Aksi per baris: Edit (modal sama), Nonaktifkan/Aktifkan, Hapus (disable kalau sudah dipakai).
- Banner peringatan jika untuk tahun berjalan tidak ada jatah aktif atau total sisa = 0: "Belum ada jatah nomor surat aktif untuk tahun XXXX. Tambahkan jatah agar Admin dapat membuat ST."

Pesan error dari RPC (jatah habis) dibiarkan muncul apa adanya di form Buat LPD.

## File yang Disentuh

- Migration baru: tabel + index + RLS + grants + `validate_allocation_range` + revisi `create_lpd_baru` + seed jatah tahun berjalan.
- `src/lib/allocation.functions.ts` (baru).
- `src/routes/_authenticated/master.nomor-surat.tsx` (baru).
- `src/routes/_authenticated/master.index.tsx` (tambah 1 item grid).

Tidak ada perubahan pada: form Buat LPD, halaman LPD detail, cetak ST, laporan, role/auth, RLS tabel `transaksi_lpd`.

## Out of Scope

- Audit log perubahan jatah.
- Notifikasi otomatis ke admin saat jatah hampir habis (bisa dipertimbangkan nanti).
- Ekspor/impor jatah.
- Perubahan format nomor surat atau template surat.
