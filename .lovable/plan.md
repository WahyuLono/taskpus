# Pengingat LPD via WhatsApp (Fonnte)

Tujuan: admin bisa mengirim pesan WhatsApp otomatis ke petugas yang belum mempertanggungjawabkan LPD setelah H+7, dengan template pesan yang bisa diedit dari Data Master.

## 1. Database

- Tambah kolom `no_wa` (text, nullable) pada `master_user`.
- Tambah index pada `transaksi_lpd(tgl_kegiatan)` dan `transaksi_lpd(status_lpd)` (kolom status di tabel ini bernama `status_lpd`).
- Tabel baru `setting_notifikasi`: `id uuid pk`, `nama_setting text unique`, `template_pesan text`, `updated_at`.
  - Grant: SELECT/UPDATE untuk `authenticated`, ALL untuk `service_role`; RLS aktif — baca untuk semua user login, ubah hanya Admin (`has_role`).
  - Insert baris default `reminder_lpd` dengan template persis seperti yang Anda berikan.

## 2. Frontend Data Master

- Halaman Master User: tambah field "No. WhatsApp" pada form tambah & edit, tampil juga di tabel.
  - Validasi: hanya angka, wajib diawali `08` atau `628`, panjang 9–15 digit; boleh dikosongkan.
  - Validasi yang sama juga di sisi server (Zod) pada fungsi create/update user.
- Halaman `/master`: tambah card baru "Setting Notifikasi" (ikon `sms`).
- Halaman baru `/master/setting-notifikasi` (Admin-only): textarea `template_pesan` + tombol simpan, dengan legenda variabel: `[nama_petugas]`, `[no_surat]`, `[tgl_kegiatan]`, `[username]`, plus tombol pratinjau contoh hasil.

## 3. Pengiriman WhatsApp (catatan teknis penting)

Proyek ini memakai TanStack Start, sehingga logika server ditulis sebagai **server function** (`createServerFn`), bukan Supabase Edge Function. Fungsi ini melakukan hal yang sama persis dengan rencana Edge Function Anda, tetapi lebih aman dan lebih cepat dipanggil dari aplikasi:

- Fungsi `sendReminderWa` (POST, wajib login + verifikasi role Admin).
- Input: `id_lpd` (server mengambil sendiri no_wa/nama/no_surat/tgl_kegiatan/username dari database agar data tidak bisa dipalsukan dari browser).
- Ambil `template_pesan` dari `setting_notifikasi` (`nama_setting = 'reminder_lpd'`), lakukan replace keempat variabel, kirim ke API Fonnte `https://api.fonnte.com/send` memakai `process.env.FONNTE_TOKEN` (secret sudah ada).
- Kirim ke semua petugas yang ditugaskan pada LPD tersebut yang punya `no_wa`; kembalikan ringkasan berhasil/gagal per nomor beserta pesan error asli dari Fonnte.

Jika Anda tetap ingin bentuk Edge Function (misal dipanggil dari pg_cron/eksternal), beri tahu saya — akan ditambahkan sebagai route publik `/api/public/notification`.

## 4. Tombol "Send Reminder WA" di daftar LPD

- `listLpd` diperluas agar ikut mengambil petugas (nama, username, no_wa) tiap baris.
- Kolom aksi baru berisi tombol reminder yang **hanya tampil bila**: user Admin **dan** `status_lpd = 'Belum'` **dan** hari ini >= `tgl_kegiatan + 7 hari`.
- Untuk petugas, status Sudah/Batal, atau belum H+7 → tombol disembunyikan.
- Tombol menampilkan state loading, lalu toast sukses ("Reminder terkirim ke N nomor") atau toast error berisi pesan kegagalan.
- Jika tidak ada petugas yang punya no_wa, tampilkan toast peringatan agar melengkapi no WA di Master User.
