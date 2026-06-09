## Masalah

Saat user mengetik nama baru di "Dalam Rangka" / "Tempat" yang melebihi 120 karakter, toast menampilkan dump JSON dari `ZodError` (mis. `[ { "code": "too_big", "maximum": 120, ... } ]`) — bukan pesan yang bisa dibaca.

Penyebab: pada server functions, validator memakai `Schema.parse(d)`. Saat gagal, `ZodError.message` adalah JSON-string dari `issues`, lalu dilempar apa adanya ke client dan tampil di `toast.error(e.message)`.

Ya, batas 120 karakter memang sengaja dipasang sebagai pembatas input untuk semua nama master (Dalam Rangka, Tempat, Golongan).

## Solusi

Dua perbaikan kecil, hanya di lapisan validasi/UI — tidak mengubah logika bisnis.

### 1) Pesan Zod berbahasa Indonesia + helper konversi error

Di `src/lib/master.functions.ts`:

- Tambahkan pesan eksplisit pada `NamaSchema` / `NamaWithIdSchema`:
  - min(2): "Nama minimal 2 karakter"
  - max(120): "Nama maksimal 120 karakter"
- Buat helper kecil `parseInput(schema, data)` yang memanggil `safeParse` dan, jika gagal, melempar `new Error(<pesan issue pertama>)` (atau gabungan pesan dipisah `;` ). Pakai helper ini di semua `.inputValidator(...)` pada file ini (addRangka/updateRangka/deleteRangka, addTempat/..., addGolongan/...).

Hasilnya: toast akan menampilkan kalimat singkat yang jelas seperti "Nama maksimal 120 karakter".

### 2) Cegah input berlebih di UI

Di `src/routes/_authenticated/lpd.baru.tsx` pada komponen `QuickSelect`, tambahkan `maxLength={120}` pada `<Input>` pencarian/tambah cepat sehingga user secara fisik tidak bisa mengetik lebih dari 120 karakter. Murni guard UX, validasi tetap di server.

## Yang tidak dilakukan

- Tidak mengubah batas 120 karakter (tetap sesuai kebijakan saat ini). konfirmasi saya : batasan dinaikan menjadi 300 karakter
- Tidak mengubah schema/migration database.
- Tidak menyentuh fitur lain di luar form Buat SPT.