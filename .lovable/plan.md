## Tujuan
Membangun alur dari Daftar LPD → Halaman Detail LPD dinamis yang lengkap (action bar, info perjalanan, daftar petugas adaptif, laporan hasil pelaksanaan), serta route cetak SPT terpisah.

## Catatan Skema
- Tabel `detail_petugas` **tidak punya kolom `urutan`** — yang ada: `id_detail` (serial), `id_user_petugas`, `id_lpd`. Akan diurutkan `ORDER BY id_detail ASC` (sesuai urutan input saat pembuatan SPT — efeknya sama dengan "urutan").
- `transaksi_lpd.url_foto` dan `hasil_kegiatan` sudah ada.
- Perlu storage bucket baru `lpd-foto` (private, dengan policy: admin & petugas-ditugaskan boleh upload/baca foto LPD-nya).

## 1. Navigasi List → Detail
Sudah berfungsi di `src/routes/_authenticated/lpd.index.tsx` (kolom aksi pakai `<Link to="/lpd/$id" params={{ id: row.id_lpd }}>Detail</Link>`). **Tidak diubah.**

## 2. Perluasan Server Function `getLpdDetail`
File: `src/lib/lpd.functions.ts`
- Tambahkan join `master_golongan(nama_golongan)` dan field `pangkat_golongan`, `unit` ke petugas + kepala.
- Ubah query `detail_petugas`:
  ```
  select id_detail, master_user:id_user_petugas(
    id_user, nip, nama, jabatan, unit, status_kepegawaian,
    master_golongan:id_golongan(nama_golongan)
  )
  order by id_detail asc
  ```
- Cek otorisasi petugas (sudah lewat RLS — petugas yang ditugaskan saja yang bisa lihat).

## 3. Server Function Baru: `submitLaporan`
File: `src/lib/lpd.functions.ts`
- Input: `id` (uuid), `hasil_kegiatan` (string min 150), `url_foto` (string).
- Validasi: user adalah Admin atau petugas yang ditugaskan untuk LPD ini.
- Update `transaksi_lpd` → `status_lpd='Sudah'`, simpan `hasil_kegiatan` & `url_foto`, set `updated_at`.

## 4. Storage Bucket + Upload
Migrasi SQL:
- Bucket `lpd-foto` (private).
- Policy SELECT/INSERT: `has_role(auth.uid(),'Admin') OR is_assigned_to_lpd(auth.uid(), <id_lpd parsed from object path>)`.
- Path convention: `lpd/{id_lpd}/foto-{timestamp}.{ext}`.

Upload dilakukan **client-side** via `supabase.storage.from('lpd-foto').upload(path, file)`, lalu URL/path dikirim ke `submitLaporan`.

## 5. Redesign Halaman Detail
File: `src/routes/_authenticated/lpd.$id.tsx` (rewrite penuh)

Struktur:
```
[Back link "← Daftar LPD"]

[Action Bar — sticky kanan-atas]
  • Judul: "Surat Perintah Tugas {no_surat}"  + StatusBadge
  • Button utama: "Cetak Surat Tugas (SPT)" (icon printer)
    → <a href="/print/lpd/{id}" target="_blank" rel="noopener">

[Card 1 — Informasi Perjalanan]
  Grid 2 kolom: Jenis Perjalanan, Maksud (Rangka), Tempat Tujuan,
  Tanggal Kegiatan, Lama, Kepala UPTD (nama+NIP).

[Card 2 — Daftar Petugas Yang Ditugaskan]
  if petugas.length === 1:
    Card tunggal besar: Nama, NIP, Pangkat/Golongan, Jabatan, Unit
    (label kiri 140px + ":" + value, monospace untuk NIP).
  else:
    Loop bernomor (1, 2, 3 …) stacked rows.
    Tiap baris pakai grid `[label 160px] [: 12px] [value]`
    sehingga tanda ":" align sempurna untuk seluruh petugas.

[Card 3 — Laporan Hasil Pelaksanaan Tugas]
  if status_lpd === 'Belum':
    Form (visible utk Admin atau petugas ditugaskan):
      • Textarea "Hasil Kegiatan" — counter karakter, min 150,
        tombol submit disabled sampai >=150.
      • Dropzone foto (drag-and-drop + click), 1 foto, preview thumbnail,
        validasi tipe (image/*) & ukuran (max 5MB).
      • Tombol "Simpan & Tandai Selesai".
    Flow submit:
      1) Upload foto ke storage → dapat path
      2) Panggil submitLaporan dengan hasil_kegiatan + url_foto
      3) Invalidate query → UI auto switch ke mode read-only.
  if status_lpd === 'Sudah':
    Read-only:
      • Heading "Hasil Kegiatan" + paragraf whitespace-pre-line.
      • Heading "Dokumentasi" + preview foto (signed URL, aspect ratio 16:9,
        klik = buka full di tab baru).
  if status_lpd === 'Batal':
    Empty state ringkas "LPD dibatalkan".

[Loading & Error]
  • Skeleton/spinner untuk fetch awal.
  • Toast + retry untuk error mutation.
  • errorComponent route untuk fetch gagal (sudah ada di root).
```

## 6. Route Cetak Baru `/print/lpd/:id`
File baru: `src/routes/_authenticated/print.lpd.$id.tsx`
- Tetap di bawah `_authenticated` (perlu sesi).
- Layout minimal A4 (CSS `@page { size: A4; margin: 2cm }`, font Times-like).
- Render kop surat (akan dibuat statis dengan teks "PEMERINTAH KAB. KOTAWARINGIN BARAT / DINAS KESEHATAN / PUSKESMAS KUMAI" — placeholder logo, mengikuti contoh `kop_surat.png`).
- Render isi sesuai template `isi_surat.png`: dasar hukum, MEMERINTAHKAN, daftar petugas (loop), bagian "Untuk", footer tanda tangan Kepala UPTD.
- `useEffect` → `window.print()` setelah data ter-load.
- Tombol "Tutup" untuk close tab (hidden di `@media print`).

> Hanya kerangka isi. Penyempurnaan kop/logo bisa dilakukan terpisah bila user mau.

## 7. Verifikasi
1. Klik "Detail" pada list → masuk ke `/lpd/{uuid}` dan data tampil.
2. Tombol "Cetak Surat Tugas" → buka tab baru `/print/lpd/{uuid}`, auto `print()`.
3. LPD dengan 1 petugas → render card tunggal.
4. LPD dengan ≥2 petugas → render daftar bernomor dengan ":" sejajar.
5. Status `Belum` → form muncul; textarea <150 char disable tombol; upload foto → submit → status switch ke `Sudah` tanpa reload.
6. Status `Sudah` → form jadi read-only dengan foto preview.
7. Gagal fetch → tampil errorComponent; gagal upload/submit → toast error.

## File Terdampak
- ✏️ `src/lib/lpd.functions.ts` — perluas `getLpdDetail`, tambah `submitLaporan`.
- ✏️ `src/routes/_authenticated/lpd.$id.tsx` — rewrite penuh.
- 🆕 `src/routes/_authenticated/print.lpd.$id.tsx` — halaman cetak.
- 🗄️ Migrasi: bucket `lpd-foto` + policy storage.

## Pertanyaan Terbuka
- Apakah perlu menyimpan logo Pemkab & Puskesmas di `src/assets/` untuk halaman cetak? (Saat ini saya rencanakan placeholder teks; mohon upload bila ingin logo aktual.)
- Untuk "Pangkat/Golongan" pada NON ASN — bila tidak punya `id_golongan`, tampilkan "—". OK?