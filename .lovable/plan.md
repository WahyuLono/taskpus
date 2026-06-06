## Fitur Notifikasi (Admin & Petugas)

Menambahkan lonceng notifikasi di header (posisi sesuai tanda merah), dengan badge jumlah belum dibaca, dropdown daftar notifikasi, dan halaman "Semua Notifikasi".

### Trigger Notifikasi

1. **Petugas → Admin**: saat petugas submit Laporan Hasil Pelaksanaan Tugas untuk minta persetujuan.
   - Pesan: "Petugas {nama} mengajukan LPD {no_surat} untuk persetujuan."
2. **Admin → Petugas (semua petugas pada SPT itu)**: saat admin menyetujui LPD.
   - Pesan: "LPD {no_surat} telah disetujui oleh admin."
3. **Admin → Petugas**: saat admin menolak LPD.
   - Pesan: "LPD {no_surat} ditolak. Catatan: {catatan}."

Klik notifikasi → arahkan ke `/lpd/{id_lpd}` dan tandai sebagai dibaca.

### Database (migration)

Tabel baru `public.notifikasi`:
- `id` (uuid, pk)
- `id_user` (uuid, target penerima — FK ke master_user)
- `id_lpd` (uuid, nullable, FK ke transaksi_lpd)
- `tipe` (enum: `lpd_submitted`, `lpd_approved`, `lpd_rejected`)
- `judul` (text), `pesan` (text)
- `is_read` (bool, default false)
- `created_at`, `read_at`

RLS: user hanya bisa SELECT/UPDATE notifikasi miliknya (`auth.uid() = id_user`).
GRANT SELECT, UPDATE ke `authenticated`; GRANT ALL ke `service_role`.

### Logika Insert Notifikasi

Diintegrasikan di SQL function yang sudah ada (paling konsisten & atomic):
- `submit_laporan_for_approval` → insert notifikasi ke semua user dengan role Admin.
- `approve_lpd` → insert notifikasi ke semua petugas pada SPT tsb.
- `reject_lpd` → idem, sertakan catatan penolakan.

### Server Functions baru di `src/lib/notifikasi.functions.ts`

- `listNotifikasi({ page, pageSize })` — daftar notifikasi user, urut terbaru.
- `countUnread()` — jumlah belum dibaca (untuk badge).
- `markAsRead({ id })` dan `markAllAsRead()`.

### UI

**Komponen baru** `src/components/notifikasi/notification-bell.tsx`:
- Tombol lonceng (`material-symbols-outlined notifications`) dengan badge merah berisi count unread.
- Polling tiap 30 detik via `useQuery` `refetchInterval` (sederhana, tanpa realtime).
- DropdownMenu menampilkan 8 notifikasi terbaru, ikon per tipe, waktu relatif (cth. "5 menit lalu"), highlight kalau belum dibaca.
- Item klik → `markAsRead` + `navigate` ke detail LPD.
- Footer dropdown: tombol "Tandai semua dibaca" dan link "Lihat semua".

**Halaman baru** `src/routes/_authenticated/notifikasi.tsx`:
- Daftar lengkap dengan paginasi, filter "Semua / Belum dibaca".

**Sisipkan** `<NotificationBell />` di header `_authenticated.tsx` antara `PageTitle` dan dropdown profil (posisi sesuai tanda merah).

### Yang tidak dilakukan

- Tidak ada push browser / email — hanya in-app.
- Tidak menambah Supabase Realtime (polling cukup); dapat di-upgrade nanti.
- Tidak mengubah alur approval/submit yang sudah ada.