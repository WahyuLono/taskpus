Apply four targeted, non-structural adjustments to `src/routes/print.lpd.$id.tsx` for A4 print fit and text correctness. No layout elements will be moved or restructured.

1. Fix "Pada Tanggal" wrapping
   - In the date table's `<tbody>`, add `whiteSpace: "nowrap"` to the first `<td>` of both rows (Dikeluarkan and Pada Tanggal).

2. CSS compression for A4 fit
   - In the `<style>` block:
     - Change `@page { size: A4; margin: 2cm 2cm 2cm 2.5cm; }` to `margin: 1.4cm 2cm 1.4cm 2.5cm;`
     - In `.spt-page`, change `font-size: 12pt;` to `font-size: 11pt;`
     - In `.spt-page`, change `line-height: 1.4;` to `line-height: 1.25;`
     - Keep `.spt-page h1` at `font-size: 13pt;`

3. Reduce spacer heights
   - In the `<header>` section, change `marginBottom: 18` to `marginBottom: 12`.
   - In the signature area at the bottom, change both handwriting-gap spacer `<div>` heights from `100` and `75` to `60`.

4. Fix header text
   - In the `<header>` section, change the `<p>` text from `PUSKESMAS KUMAI` to `UPTD PUSKESMAS KUMAI` (fontSize remains 16pt).