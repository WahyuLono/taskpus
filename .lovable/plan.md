Replace the existing `{/* Footer ttd */}` block in `src/routes/print.lpd.$id.tsx` with the user-supplied structure: render the Dikeluarkan/Pada Tanggal table first (right-aligned, marginTop 30, marginBottom 20), then a flex row with two equal-treated columns — left (width 250, centered) showing "Mengetahui," + 80px spacer + `( ........ )`, and right (width 300, centered) showing "Kepala UPTD Puskesmas Kumai" + 80px spacer + bold+underline `lpd.kepala?.nama`, golongan, and `NIP {formatNip(lpd.kepala.nip)}`. No other changes.

### Files
- `src/routes/print.lpd.$id.tsx` (edit only)
