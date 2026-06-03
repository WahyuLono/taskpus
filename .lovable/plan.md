# Plan: Kompresi Gambar Otomatis pada Upload Foto Dokumentasi

## Tujuan
Mengompres foto di sisi klien sebelum diunggah ke Supabase Storage, target ≤250KB, tanpa menurunkan kualitas secara drastis.

## Scope
- Hanya menyentuh form upload foto pada **Laporan LPD** (`src/routes/_authenticated/lpd.$id.tsx`).
- Tidak mengubah server function, RLS, schema, atau alur approval.
- HEIC tidak didukung — file HEIC ditolak dengan pesan jelas.

## Langkah

### 1. Tambah dependency
- `bun add browser-image-compression`

### 2. Modifikasi `handleFile` di `lpd.$id.tsx`
- Jadikan async.
- Urutan validasi → kompresi → set state:
  1. Cek tipe `image/*`, tolak `image/heic` & `image/heif` dengan pesan: "Format HEIC tidak didukung. Konversi ke JPG/PNG terlebih dahulu."
  2. Cek ukuran mentah ≤ `MAX_FOTO_MB` (guard sebelum kompresi).
  3. Tampilkan toast loading "Mengompres foto…".
  4. Panggil `imageCompression(file, options)` dengan:
     - `maxSizeMB: 0.25`
     - `maxWidthOrHeight: 1920`
     - `initialQuality: 0.8`
     - `useWebWorker: true`
     - `fileType: 'image/jpeg'`
  5. Bungkus hasil jadi `File` baru dengan nama `<original-basename>.jpg` agar ekstensi konsisten dengan path Storage.
  6. Tampilkan toast sukses dengan info ukuran sebelum/sesudah (mis. "1.8 MB → 210 KB").
  7. Set `file` dan `preview` dari hasil kompresi.
- Fallback: bila kompresi throw, log warning + toast warning, tetap pakai file asli supaya user tidak terblokir.

### 3. Penyesuaian kecil pada mutation
- Hapus penentuan `ext` dari `file.name` lama; pakai langsung `jpg` (karena sudah dinormalisasi). Tetap kirim `contentType: file.type` untuk fleksibilitas fallback.

## Detail Teknis

```ts
// src/routes/_authenticated/lpd.$id.tsx
import imageCompression from "browser-image-compression";

const COMPRESSION_OPTS = {
  maxSizeMB: 0.25,
  maxWidthOrHeight: 1920,
  initialQuality: 0.8,
  useWebWorker: true,
  fileType: "image/jpeg" as const,
};

const handleFile = async (f: File | null) => {
  if (!f) { setFile(null); setPreview(null); return; }

  if (/heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name)) {
    toast.error("Format HEIC tidak didukung", {
      description: "Silakan konversi ke JPG/PNG terlebih dahulu.",
    });
    return;
  }
  if (!f.type.startsWith("image/")) {
    toast.error("File harus berupa gambar");
    return;
  }
  if (f.size > MAX_FOTO_MB * 1024 * 1024) {
    toast.error(`Ukuran file maksimal ${MAX_FOTO_MB}MB`);
    return;
  }

  const tId = toast.loading("Mengompres foto…");
  try {
    const compressed = await imageCompression(f, COMPRESSION_OPTS);
    const finalFile = new File(
      [compressed],
      f.name.replace(/\.[^.]+$/, "") + ".jpg",
      { type: "image/jpeg" },
    );
    toast.success("Foto siap diunggah", {
      id: tId,
      description: `${formatBytes(f.size)} → ${formatBytes(finalFile.size)}`,
    });
    setFile(finalFile);
    setPreview(URL.createObjectURL(finalFile));
  } catch (err) {
    toast.warning("Kompresi gagal, memakai file asli", {
      id: tId,
      description: (err as Error).message,
    });
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }
};
```

Tambah helper kecil `formatBytes(n)` lokal (KB/MB dengan 1 desimal).

## Yang Tidak Berubah
- Server function `submitLaporan`, RLS, bucket `laporan_lpd`.
- Validasi `MAX_FOTO_MB` tetap (guard input mentah).
- Alur approval, print SPT/LPD, dan komponen lain.

## Verifikasi
- Upload JPG besar (>2MB) → toast menampilkan penurunan ke ~200KB, preview tampil, submit sukses.
- Upload PNG → ter-konversi ke JPG ≤250KB.
- Upload HEIC → ditolak dengan pesan jelas.
- Upload gambar yang sudah <250KB → tetap diterima (library skip otomatis), submit normal.
