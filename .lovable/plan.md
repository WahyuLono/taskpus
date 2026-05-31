
# Proposal Penawaran Aplikasi LPD — Puskesmas Kumai

Membuat satu file PDF (bukan fitur web app) berisi proposal penawaran berdasarkan aplikasi LPD yang sudah dibangun bersama. Tidak ada perubahan kode pada aplikasi.

## Output

- File: `/mnt/documents/proposal-lpd-puskesmas-kumai.pdf`
- Ukuran: A4, margin 2cm, font profesional (Helvetica/Times), 1 warna aksen (biru tua menyesuaikan brand puskesmas/instansi).
- Akan ditampilkan ke user via `<presentation-artifact>` setelah dibuat.

## Struktur isi proposal

1. **Kop & Judul**
   - Judul: "Proposal Pengembangan Aplikasi Laporan Pelaksanaan Dinas (LPD)"
   - Ditujukan kepada: **Kepala UPTD Puskesmas Kumai**
   - Tanggal: 31 Mei 2026

2. **Latar Belakang** (singkat)
   - Kebutuhan digitalisasi pencatatan LPD, cetak laporan, dan manajemen data pegawai/golongan/tempat.

3. **Ringkasan Aplikasi yang Dibangun**
   Modul utama (diambil dari struktur kode aktual):
   - Autentikasi & manajemen user (admin/pegawai)
   - Modul LPD: buat, edit, daftar, detail
   - Cetak Laporan & Cetak LPD (siap A4)
   - Master data: Golongan, Tempat, Rangka, Nomor Surat, User
   - Dashboard & halaman Tugas
   - Profil pengguna

4. **Teknologi**
   - Frontend: React 19 + TanStack Start (TypeScript, Tailwind v4)
   - Backend: Lovable Cloud (Supabase) — Auth, Database (RLS), Server Functions
   - Deploy: Cloudflare Workers (edge)

5. **Rekap Waktu Pengerjaan**
   Tabel:
   | Tanggal | Aktivitas | Jam |
   |---|---|---|
   | 16 Mei 2026 | Penyusunan PRD (Product Requirement Doc) | 10 jam |
   | 17 Mei 2026 | Penyusunan PRD (lanjutan & finalisasi) | 6 jam |
   | 18–31 Mei 2026 | Implementasi modul, integrasi DB, cetak laporan, QA & revisi | (disertakan sebagai "implementasi & iterasi") |
   | **Total fase PRD** | | **16 jam** |

   Catatan: hanya jam PRD yang dirinci karena itu data pasti yang Anda berikan; fase implementasi disebut sebagai cakupan kerja tanpa angka jam spesifik.

6. **Penawaran Harga**
   - Nilai investasi: **Rp 6.500.000,-** (enam juta lima ratus ribu rupiah)
   - Sudah termasuk: pengembangan seluruh modul di atas, deployment awal, dokumentasi singkat penggunaan.
   - Belum termasuk (opsional): pelatihan onsite, biaya domain kustom, pengembangan fitur tambahan di luar lingkup.

7. **Syarat & Ketentuan Pembayaran** (umum)
   - DP 50% di awal, pelunasan 50% setelah serah terima.
   - Garansi bug 30 hari setelah serah terima.

8. **Penutup & Tanda Tangan**
   - Hormat saya, ……………… (diisi nama pengembang oleh user nanti — placeholder).

## Implementasi teknis

- Script Python (reportlab) di `/tmp/gen_proposal.py` → tulis PDF langsung ke `/mnt/documents/`.
- QA wajib: render PDF ke gambar (`pdftoppm`) dan inspeksi setiap halaman sebelum kirim, perbaiki bila ada overflow/teks terpotong.

## Yang TIDAK dilakukan

- Tidak menambah halaman/route di aplikasi.
- Tidak mengubah database, kode, atau styling app.
- Tidak menggunakan kop/logo resmi (kecuali Anda berikan file logo nanti).
