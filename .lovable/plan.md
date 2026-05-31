Revisi total layout sel "Hasil Kegiatan" pada `src/routes/print.laporan.$id.tsx` agar persis template.

Ganti grid CSS dengan satu `<table class="hk-table">` 5 kolom (22px / 22px / 170px / 10px / auto):
- A./B. → col1 huruf, col2-5 merge "INPUT"/"PROSES" bold (tanpa `:`)
- Sub-item → col1 kosong, col2 nomor, col3 label, col4 `:`, col5 nilai
- C./D. → col1 huruf, col2+col3 merge "OUTPUT"/"TINDAK LANJUT" bold, col4 `:`, col5 nilai

Hapus CSS `.lpd-sub`, `.lpd-group`, `.lpd-row`, `.lpd-row-inline` dan helper `DetailRow`. Tambah `.hk-table` (border-collapse, padding 1px 0, no border).