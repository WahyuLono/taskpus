import { cn } from "@/lib/utils";

type Status = "Belum" | "Sudah" | "Batal" | null | undefined;

export function StatusBadge({ status }: { status: Status }) {
  const map = {
    Belum: { label: "Menunggu", cls: "bg-status-menunggu/15 text-status-menunggu" },
    Sudah: { label: "Selesai", cls: "bg-status-selesai/15 text-status-selesai" },
    Batal: { label: "Dibatalkan", cls: "bg-status-batal/15 text-status-batal" },
  } as const;
  const s = status && map[status as keyof typeof map];
  if (!s) return <span className="text-on-surface-variant text-xs">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold",
        s.cls,
      )}
    >
      {s.label}
    </span>
  );
}
