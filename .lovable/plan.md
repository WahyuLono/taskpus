Edit `src/routes/print.lpd.$id.tsx` only — surgical visual fixes to the print template. No business logic, no data fetching changes.

### Changes

1. **Font Arial** — In the `<style>` block, change `.spt-page` font-family to `Arial, sans-serif`.

2. **DASAR numbering** — Keep the existing `<ol>` with the 3 items (already vertical/numbered), but ensure label cell and list align top. Verify the `<ol>` renders `1. 2. 3.` properly aligned with `padding-left: 20px` and `list-style-position: outside`.

3. **Signature block right-aligned, inner text centered** — Replace the two-column footer `<table>` with a single right-side block: `<div style="display:flex; justify-content:flex-end; margin-top: 30px;">` containing an inner `<div style="text-align:center; min-width: 280px;">` that stacks:
   - "Mengetahui,"
   - "Kepala UPTD Puskesmas Kumai"
   - 70px spacer
   - Bold name
   - Golongan
   - NIP
   
   The "Dikeluarkan / Pada Tanggal" lines move just above this block, also right-aligned (flex justify-end) but with left-aligned inner key:value rows.

4. **Logos in Kop Surat** — Restructure header into a 3-column flex: `[left logo 75px] [center text block] [right logo 75px]`. Use `<img src="" alt="Logo Kiri" style="width:75px; height:75px; object-fit:contain;" />` with HTML comment `<!-- TODO: paste logo URL here -->` above each img tag.

5. **Remove underlines** — Strip `textDecoration: "underline"` from these cells/elements:
   - "Nomor : ..." paragraph (line 107)
   - "Dasar :" td (line 116)
   - "Kepada :" td (line 146)
   - "Untuk :" td (line 201)
   - "Pangkat / Golongan" td (line 171)
   - "Jabatan" td (line 179)
   
   Keep underline on the `<h1>SURAT PERINTAH TUGAS</h1>` title and on the signature name (those weren't called out for removal).

6. **Bold nama_rangka** — In the "Untuk" paragraph (line 206-210), wrap `{lpd.master_rangka?.nama_rangka ?? ""}` in `<strong>` (renders bold).

### Files
- `src/routes/print.lpd.$id.tsx` (edit only)

### Verification
After edit, open `/print/lpd/:id` for an existing LPD and confirm: Arial font everywhere, two logo placeholders flanking the kop, DASAR shows 1/2/3 stacked vertically, no underline on the listed labels, nama_rangka bold inside "Untuk" sentence, signature block sits on the right with centered inner text.
