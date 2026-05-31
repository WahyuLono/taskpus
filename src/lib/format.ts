const ID_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
const ID_MONTHS_FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function formatDate(input: string | null | undefined, full = false): string {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  const months = full ? ID_MONTHS_FULL : ID_MONTHS;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start) return "—";
  if (!end || start === end) return formatDate(start);
  const a = new Date(start);
  const b = new Date(end);
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${a.getDate()}–${b.getDate()} ${ID_MONTHS[a.getMonth()]} ${a.getFullYear()}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function formatNip(nip: string | null | undefined): string {
  return nip && nip.trim() ? nip : "-";
}

export function formatDateRangeFull(start?: string | null, end?: string | null): string {
  if (!start) return "—";
  const endVal = end ?? start;
  return `${formatDate(start)} s/d ${formatDate(endVal)}`;
}

export function formatGolongan(
  id_golongan: number | null | undefined,
  golMap?: Map<number, string>,
): string {
  if (!id_golongan) return "-";
  return golMap?.get(id_golongan) ?? "-";
}
