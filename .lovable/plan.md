Ganti endpoint egress di `src/lib/capacity.functions.ts` dari `/v1/projects/{ref}/daily-stats` (404, internal) ke endpoint resmi Management API:

1. `GET /v1/projects/{ref}` → ambil `organization_id`.
2. `GET /v1/organizations/{slug}/usage` → list metric usage bulan billing berjalan.
3. Jumlahkan semua metric dengan key/`metric` mengandung `egress` (db_egress, storage_egress, realtime_egress, func_egress, dll). Ambil `usage` sebagai pemakaian dan `pricing_free_units` sebagai limit kalau tersedia; kalau tidak, fallback ke konstanta 5 GB.
4. Pertahankan penanganan error: 401/403/non-200/exception → kembalikan `{ status: 'error', limit, error }` agar UI menampilkan bar abu + pesan, tanpa mengganggu Database & Storage.

Tidak ada perubahan komponen, migration, secret, atau file lain.