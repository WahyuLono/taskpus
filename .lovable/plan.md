## Tujuan

Menambahkan workflow approval untuk Laporan Pelaksanaan Dinas (LPD) dan fitur **Cetak LPD** yang hanya muncul untuk petugas setelah laporan disetujui Admin. Mirip alur Cetak SPT yang sudah ada, tapi terpisah dan dengan layout sesuai template terlampir.

## Alur lengkap

```text
Petugas isi A–C + foto  ──►  semua field lengkap?
                                    │ ya
                                    ▼
                            approval_status = "Menunggu"
                            (edit dikunci untuk petugas)
                                    │
                          Admin review di detail LPD
                          ┌─────────┴─────────┐
                          ▼                   ▼
                      Approve              Reject (wajib isi catatan)
                          │                   │
            approval_status = "Disetujui"   approval_status = "Ditolak"
            tombol "Cetak LPD" muncul       petugas bisa edit lagi
            (hanya untuk petugas LPD ini)   catatan reject ditampilkan
                                            simpan → kembali ke "Menunggu"
```

## Perubahan database (1 migrasi)

Tabel `transaksi_lpd`:
- Tambah enum `approval_status_lpd` dengan nilai: `Draft`, `Menunggu`, `Disetujui`, `Ditolak`.
- Tambah kolom `approval_status approval_status_lpd NOT NULL DEFAULT 'Draft'`.
- Tambah kolom `catatan_reject text NULL`.
- Tambah kolom `approved_by uuid NULL`, `approved_at timestamptz NULL` (untuk audit & tampilan).
- Tambah index ringan pada `approval_status`.

RLS pada `transaksi_lpd`:
- Policy `Update assigned or admin` dipisah menjadi dua:
  - **Petugas UPDATE**: hanya boleh saat `approval_status IN ('Draft','Ditolak')` (auto-submit ke `Menunggu` ditangani lewat server function).
  - **Admin UPDATE**: bebas (untuk approve/reject + edit data master).
- Approve/Reject dilakukan via server function `SECURITY DEFINER` agar audit fields ikut terisi konsisten.

Backfill: semua baris existing di-set `approval_status = 'Draft'`.

## Perubahan backend (server functions di `src/lib/lpd.functions.ts`)

1. **`submitLaporan` (modifikasi)**
   - Setelah simpan field A–C + foto, cek apakah semua wajib terisi (`input_alat`, `input_metode`, `input_lama_kegiatan`, `proses_sasaran`, `proses_hambatan`, `output`, `tindak_lanjut`, `url_foto`).
   - Jika lengkap → set `approval_status = 'Menunggu'`, kosongkan `catatan_reject`.
   - Jika belum lengkap → tetap `Draft`.
   - Tolak update jika status saat ini `Menunggu` atau `Disetujui` (cegah race).

2. **`approveLpd` (baru, Admin only)**
   - Set `approval_status='Disetujui'`, `approved_by=auth.uid()`, `approved_at=now()`, `catatan_reject=null`.

3. **`rejectLpd` (baru, Admin only)**
   - Input: `id`, `catatan` (Zod: min 3 char, max 500).
   - Set `approval_status='Ditolak'`, simpan `catatan_reject`, kosongkan `approved_by/at`.

4. **`getLpdDetail` (modifikasi)**: ikut return `approval_status`, `catatan_reject`, `approved_at`, dan nama `approved_by`.

## Perubahan frontend

### `src/routes/_authenticated/lpd.$id.tsx` (halaman detail)

- **Banner status approval** di atas form laporan:
  - `Draft` → info netral "Lengkapi semua field untuk dikirim ke Admin".
  - `Menunggu` → info kuning "Menunggu persetujuan Admin. Anda tidak dapat mengubah laporan."
  - `Disetujui` → info hijau dengan nama approver & timestamp.
  - `Ditolak` → info merah, tampilkan `catatan_reject`, tombol "Revisi laporan" yang membuka kembali form.
- **Kunci form petugas** ketika `approval_status IN ('Menunggu','Disetujui')`: semua textarea & upload foto `disabled`, tombol Simpan disembunyikan.
- **Tombol Cetak LPD** (petugas, bukan admin):
  - Muncul **hanya** saat `approval_status === 'Disetujui'` DAN user bukan Admin DAN user adalah petugas LPD ini.
  - Membuka `/print/laporan/$id` di tab baru.
- **Panel Admin review** (admin only, muncul saat status `Menunggu`):
  - Tombol "Setujui" → konfirmasi → panggil `approveLpd`.
  - Tombol "Tolak" → buka dialog dengan textarea catatan (wajib) → panggil `rejectLpd`.
  - Saat status `Disetujui`/`Ditolak`, admin lihat ringkasan keputusan (siapa, kapan, catatan).

### `src/routes/print.laporan.$id.tsx` (baru)

Halaman cetak terpisah, **bukan** memodifikasi `print.lpd.$id.tsx` (yang sebenarnya untuk SPT).

- Guard akses: hanya boleh saat `approval_status === 'Disetujui'` DAN user adalah petugas LPD ini (bukan Admin). Jika tidak, tampilkan pesan akses ditolak.
- Auto-trigger `window.print()` setelah data loaded (sama seperti SPT).
- Layout mengikuti template terlampir (A4 portrait, font Arial 11pt):

```text
                LAPORAN PERJALANAN DINAS
┌───┬──────────────────────┬──────────────────────────────────────┐
│ 1 │ Maksud dan Tujuan    │ {nama_rangka}                        │
│ 2 │ Tempat Tujuan        │ {nama_tempat}                        │
│ 3 │ Tanggal Pelaksanaan  │ {tgl_kegiatan} s/d {tgl_selesai}     │
│ 4 │ Hasil Kegiatan       │ A. INPUT                              │
│   │                      │    1. Pelaksana Kegiatan : {N} orang  │
│   │                      │    2. Sumber Dana        : BOK        │
│   │                      │    3. Alat yang Digunakan: {input_alat}│
│   │                      │    4. Metode             : {input_metode}│
│   │                      │    5. Lama Kegiatan      : {input_lama_kegiatan}│
│   │                      │ B. PROSES                             │
│   │                      │    1. Sasaran            : {proses_sasaran}│
│   │                      │    2. Jadwal             : {tgl_kegiatan}│
│   │                      │    3. Tempat Pelaksanaan : {nama_tempat}│
│   │                      │    4. Hambatan           : {proses_hambatan}│
│   │                      │ C. OUTPUT                : {output}    │
│   │                      │ D. TINDAK LANJUT         : {tindak_lanjut}│
├───┼──────────────────────┼──────────────────────────────────────┤
│ 5 │ Dokumentasi          │ [render <img src={url_foto}> bukan URL]│
└───┴──────────────────────┴──────────────────────────────────────┘

Yang Melaksanakan Perjalanan Dinas:

1. Nama : {petugas[0].nama}
   NIP  : {petugas[0].nip}
                                      (……………………………)

2. Nama : {petugas[1].nama}   ← muncul dinamis sesuai jumlah petugas
   NIP  : {petugas[1].nip}
                                      (……………………………)
```

Catatan teknis layout:
- Nomor baris di-render otomatis (1–5), tidak ada penomoran "4" duplikat seperti di template.
- Loop blok tanda tangan untuk semua petugas (mendukung 1, 2, atau lebih).
- Foto: tampilkan gambar via `<img>` dengan `max-width:100%`, `max-height:8cm`; URL dari `url_foto` (bucket `laporan_lpd`, signed URL via server jika perlu — atau public path yang sudah dipakai sekarang).
- Tidak ada kop surat (sesuai template — beda dengan SPT).
- Tombol "Cetak" & "Tutup" floating dengan class `no-print`.

## Bagian teknis (untuk reviewer teknis)

- Enum baru: `CREATE TYPE public.approval_status_lpd AS ENUM (...)`.
- RLS petugas write: tambahkan `WHERE approval_status IN ('Draft','Ditolak')` di `USING`/`WITH CHECK`, sementara admin tetap unrestricted via `has_role`.
- Server functions baru memakai pola `createServerFn` + `requireSupabaseAuth` yang sudah ada di project; admin check via `has_role` di SQL (RPC) atau lewat select `master_user.role_user` di handler.
- File route baru `src/routes/print.laporan.$id.tsx` (dot-separated → URL `/print/laporan/$id`), bukan di bawah `_authenticated` agar bisa di-print di tab terpisah seperti pola SPT existing.
- TypeScript types Supabase akan auto-regenerate setelah migrasi.

## Yang TIDAK berubah

- Cetak SPT (`/print/lpd/$id`) tetap berfungsi sama persis, hanya untuk Admin.
- Field laporan, validasi upload foto, RLS `detail_petugas`, dan logika allocation nomor surat tidak disentuh.
