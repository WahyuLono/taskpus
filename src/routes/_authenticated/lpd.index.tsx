import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLpd } from "@/lib/lpd.functions";
import { StatusBadge } from "@/components/lpd/status-badge";
import { formatDateRange } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/lpd/")({
  component: LpdListPage,
});

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "Belum", label: "Menunggu" },
  { key: "Sudah", label: "Selesai" },
  { key: "Batal", label: "Dibatalkan" },
] as const;

function LpdListPage() {
  const { data: me } = useCurrentUser();
  const [status, setStatus] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [search, setSearch] = useState("");
  const fetchList = useServerFn(listLpd);
  const q = useQuery({
    queryKey: ["lpd-list", status, search],
    queryFn: () =>
      fetchList({
        data: {
          limit: 100,
          status: status === "all" ? undefined : (status as "Belum" | "Sudah" | "Batal"),
          search: search || undefined,
        },
      }),
  });

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-xl border border-outline-variant shadow-card p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-full transition-colors",
                status === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 !text-[18px] text-on-surface-variant">
              search
            </span>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor surat…"
              className="pl-9 w-64"
            />
          </div>
          {me?.role_user === "Admin" && (
            <Link
              to="/lpd/baru"
              className="inline-flex items-center gap-1 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
            >
              <span className="material-symbols-outlined !text-[18px]">add</span>
              Buat
            </Link>
          )}
        </div>
      </div>

      <section className="bg-card rounded-xl border border-outline-variant shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">No. Surat</th>
                <th className="text-left px-5 py-3 font-semibold">Dalam Rangka</th>
                <th className="text-left px-5 py-3 font-semibold">Tempat</th>
                <th className="text-left px-5 py-3 font-semibold">Tanggal</th>
                <th className="text-left px-5 py-3 font-semibold">Hari</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {q.isLoading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-on-surface-variant">
                    Memuat…
                  </td>
                </tr>
              )}
              {q.data?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-on-surface-variant">
                    Tidak ada data.
                  </td>
                </tr>
              )}
              {q.data?.map((row: any) => (
                <tr key={row.id_lpd} className="hover:bg-primary/5 transition-colors">
                  <td className="px-5 py-3 font-semibold text-primary">{row.no_surat}</td>
                  <td className="px-5 py-3">{row.master_rangka?.nama_rangka ?? "—"}</td>
                  <td className="px-5 py-3">{row.master_tempat?.nama_tempat ?? "—"}</td>
                  <td className="px-5 py-3 tabular-nums">
                    {formatDateRange(row.tgl_kegiatan, row.tgl_selesai)}
                  </td>
                  <td className="px-5 py-3 tabular-nums">{row.lama_hari}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={row.status_lpd} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      to="/lpd/$id"
                      params={{ id: row.id_lpd }}
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
