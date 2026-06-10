## Masalah
Endpoint Management API untuk membaca usage/egress per organisasi tidak tersedia secara publik (404). Pengguna memilih untuk menghapus baris ketiga (Egress) dari kartu kapasitas, sehingga hanya menyisakan Database dan File Storage.

## Perubahan

### 1. `src/components/dashboard/capacity-card.tsx`
- Hapus baris render `<Row label="Egress (bulan ini)" ... />`
- Kartu tetap menampilkan Database dan File Storage

### 2. `src/lib/capacity.functions.ts`
- Hapus field `egress` dari type `CapacityResponse`
- Hapus konstanta `LIMITS.egress`
- Hapus seluruh fungsi `fetchEgress()`
- Hapus pemanggilan `fetchEgress()` di `Promise.allSettled`
- Hapus pemrosesan hasil `egRes` dan field `egress` di return value handler

## Hasil akhir
Kartu kapasitas hanya menampilkan 2 baris: Database dan File Storage — tanpa kode mati atau type error.