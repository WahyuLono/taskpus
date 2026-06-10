import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSupabaseCapacity, type CapacityMetric } from "@/lib/capacity.functions";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

const THRESHOLD = { warn: 0.7, danger: 0.9 };

function colorFor(pct: number) {
  if (pct >= THRESHOLD.danger) {
    return { bar: "bg-status-batal", text: "text-status-batal" };
  }
  if (pct >= THRESHOLD.warn) {
    return { bar: "bg-status-menunggu", text: "text-status-menunggu" };
  }
  return { bar: "bg-status-selesai", text: "text-status-selesai" };
}

function Row({
  label,
  metric,
  isLoading,
}: {
  label: string;
  metric?: CapacityMetric;
  isLoading: boolean;
}) {
  if (isLoading || !metric) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-on-surface">{label}</span>
          <span className="text-on-surface-variant">Memuat…</span>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-container animate-pulse" />
      </div>
    );
  }

  if (metric.status === "error") {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-on-surface">{label}</span>
          <span
            className="text-on-surface-variant truncate max-w-[60%]"
            title={metric.error}
          >
            — / {formatBytes(metric.limit)}
          </span>
        </div>
        <div
          className="h-2 w-full rounded-full bg-surface-container border border-dashed border-outline-variant"
          title={metric.error}
        />
        <p className="text-[10px] text-on-surface-variant truncate" title={metric.error}>
          {metric.error}
        </p>
      </div>
    );
  }

  const pct = Math.min(1, metric.limit > 0 ? metric.used / metric.limit : 0);
  const c = colorFor(pct);
  const pctLabel = (pct * 100).toFixed(pct >= 0.1 ? 0 : 1);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-on-surface">{label}</span>
        <span className={cn("tabular-nums", c.text)}>
          {formatBytes(metric.used)} / {formatBytes(metric.limit)}{" "}
          <span className="font-semibold">· {pctLabel}%</span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface-container overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", c.bar)}
          style={{ width: `${Math.max(2, pct * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function CapacityCard() {
  const fetchCapacity = useServerFn(getSupabaseCapacity);
  const q = useQuery({
    queryKey: ["supabase-capacity"],
    queryFn: () => fetchCapacity(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const updated = q.dataUpdatedAt
    ? new Date(q.dataUpdatedAt).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <section className="bg-card rounded-xl border border-outline-variant shadow-card overflow-hidden flex flex-col">
      <header className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined !text-[20px] text-primary">database</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-on-surface leading-tight">Kapasitas Supabase</h3>
            <p className="text-[11px] text-on-surface-variant">Free Tier · pemakaian terkini</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => q.refetch()}
          disabled={q.isFetching}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-surface-container text-on-surface-variant disabled:opacity-50"
          title="Muat ulang"
        >
          <span
            className={cn(
              "material-symbols-outlined !text-[18px]",
              q.isFetching && "animate-spin",
            )}
          >
            refresh
          </span>
        </button>
      </header>

      <div className="p-5 space-y-4 flex-1">
        {q.isError && !q.data ? (
          <div className="text-sm text-status-batal">
            Gagal memuat data kapasitas: {(q.error as Error)?.message ?? "Unknown"}
          </div>
        ) : (
          <>
            <Row label="Database" metric={q.data?.database} isLoading={q.isLoading} />
            <Row label="File Storage" metric={q.data?.storage} isLoading={q.isLoading} />
            <Row label="Egress (bulan ini)" metric={q.data?.egress} isLoading={q.isLoading} />
          </>
        )}
      </div>

      {updated && (
        <footer className="px-5 py-2 border-t border-outline-variant text-[10px] text-on-surface-variant text-right">
          Diperbarui {updated}
        </footer>
      )}
    </section>
  );
}
