import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats, listLpd } from "@/lib/lpd.functions";
import { useCurrentUser } from "@/hooks/use-current-user";
import { StatusBadge } from "@/components/lpd/status-badge";
import { formatDateRange } from "@/lib/format";
import { CapacityCard } from "@/components/dashboard/capacity-card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: me, isReady } = useCurrentUser();
  const fetchStats = useServerFn(getDashboardStats);
  const fetchList = useServerFn(listLpd);

  const enabled = isReady && !!me;
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => fetchStats(), enabled });
  const recent = useQuery({
    queryKey: ["lpd-recent"],
    queryFn: () => fetchList({ data: { page: 1, pageSize: 8 } }),
    enabled,
  });
  const recentRows = recent.data?.rows ?? [];

  const cards = [
    { label: "Total LPD", value: stats.data?.total ?? "—", icon: "description", tint: "primary" },
    { label: "Menunggu", value: stats.data?.belum ?? "—", icon: "schedule", tint: "menunggu" },
    { label: "Selesai", value: stats.data?.sudah ?? "—", icon: "task_alt", tint: "selesai" },
    { label: "Dibatalkan", value: stats.data?.batal ?? "—", icon: "cancel", tint: "batal" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-sm text-on-surface-variant">Selamat datang kembali,</p>
          <h2 className="text-2xl font-bold text-on-surface">
            {!isReady ? "Memuat…" : (me?.nama ?? "Pengguna")}
          </h2>
        </div>
        {isReady && me?.role_user === "Admin" && (
          <Link
            to="/lpd/baru"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-card"
          >
            <span className="material-symbols-outlined !text-[20px]">add</span>
            Buat SPT Baru
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-card rounded-xl p-5 border border-outline-variant shadow-card"
          >
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {c.label}
              </p>
              <span
                className={
                  "h-9 w-9 rounded-lg inline-flex items-center justify-center " +
                  (c.tint === "primary"
                    ? "bg-primary/10 text-primary"
                    : c.tint === "menunggu"
                      ? "bg-status-menunggu/15 text-status-menunggu"
                      : c.tint === "selesai"
                        ? "bg-status-selesai/15 text-status-selesai"
                        : "bg-status-batal/15 text-status-batal")
                }
              >
                <span className="material-symbols-outlined !text-[18px]">{c.icon}</span>
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-card rounded-xl border border-outline-variant shadow-card overflow-hidden">

        <header className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <div>
            <h3 className="font-semibold text-on-surface">LPD Terbaru</h3>
            <p className="text-xs text-on-surface-variant">8 surat tugas terbaru</p>
          </div>
          <Link to="/lpd" className="text-sm text-primary font-medium hover:underline">
            Lihat semua →
          </Link>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">No. Surat</th>
                <th className="text-left px-5 py-3 font-semibold">Jenis</th>
                <th className="text-left px-5 py-3 font-semibold">Tempat</th>
                <th className="text-left px-5 py-3 font-semibold">Tanggal</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {recent.isLoading && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-on-surface-variant">
                    Memuat…
                  </td>
                </tr>
              )}
              {recentRows.length === 0 && !recent.isLoading && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-on-surface-variant">
                    Belum ada LPD.
                  </td>
                </tr>
              )}
              {recentRows.map((row: any) => (
                <tr key={row.id_lpd} className="hover:bg-primary/5 transition-colors">
                  <td className="px-5 py-3 font-medium">
                    <Link
                      to="/lpd/$id"
                      params={{ id: row.id_lpd }}
                      className="text-primary hover:underline"
                    >
                      {row.no_surat}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{row.jenis_perjadin}</td>
                  <td className="px-5 py-3">{row.master_tempat?.nama_tempat ?? "—"}</td>
                  <td className="px-5 py-3 tabular-nums">
                    {formatDateRange(row.tgl_kegiatan, row.tgl_selesai)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={row.status_lpd} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </section>

        {isReady && me?.role_user === "Admin" && <CapacityCard />}
      </div>
    </div>

  );
}
