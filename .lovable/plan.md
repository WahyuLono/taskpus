Edit `src/routes/print.lpd.$id.tsx` only — surgical JSX/style updates to match the attached reference screenshots.

### Changes

1. **terbilang helper + dynamic duration line**
   - Add helper inside `PrintSptPage` just before `return`:
     ```ts
     const terbilang = (angka: number): string => {
       const huruf = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas", "dua belas", "tiga belas", "empat belas", "lima belas"];
       return angka < huruf.length ? huruf[angka] : angka.toString();
     };
     ```
   - Replace the first `<li>` under the "Untuk" `<ol>` with:
     `<li>Lamanya perjalanan dinas selama {lpd.lama_hari} ({terbilang(lpd.lama_hari)}) hari.</li>`

2. **Force visible list numbering on `<ol>`**
   - In the `<style>` block, change `.spt-page ol` rule to:
     `.spt-page ol { margin: 0; padding-left: 24px; list-style-position: outside; list-style-type: decimal !important; }`
   - Add `className="list-decimal"` to both `<ol>` elements (Dasar section and Untuk section).

3. **Logo placeholders visible**
   - In `<header>`, set left `<img src="https://placehold.co/75x75.png?text=LOGO+1" />` and right `<img src="https://placehold.co/75x75.png?text=LOGO+2" />`.
   - Keep the `{/* TODO: paste logo URL here */}` comments above each img.

4. **Signature block — two-column layout**
   - Replace the entire `{/* Footer ttd */}` block with the exact 2-column flex layout supplied by the user: left column (width 250, centered) shows "Mengetahui," + 100px spacer + `( ............ )`; right column (width 300) shows the Dikeluarkan/Pada Tanggal table (margin-left auto) then a centered "Kepala UPTD Puskesmas Kumai" block with 75px spacer, bold+underline `lpd.kepala?.nama`, golongan, and `NIP {formatNip(lpd.kepala.nip)}`.

### Files
- `src/routes/print.lpd.$id.tsx` (edit only — JSX in return + add helper inside component + tweak one CSS rule in the embedded `<style>`).

### Verification
Open `/print/lpd/:id` and confirm: Dasar and Untuk lists show "1. 2. 3." numbering, duration line renders e.g. "selama 3 (tiga) hari", both logo placeholders visible in the kop, and the footer has "Mengetahui" on the left with signature space and "Kepala UPTD Puskesmas Kumai" stack on the right under the Dikeluarkan/Pada Tanggal table.
