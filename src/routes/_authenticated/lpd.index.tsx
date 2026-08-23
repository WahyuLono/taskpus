import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { listLpd } from "@/lib/lpd.functions";
import { StatusBadge } from "@/components/lpd/status-badge";
import { formatDateRange } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendReminderWa } from "@/lib/notifikasi-wa.functions";

const PAGE_SIZE = 12;

function isPastH7(tgl?: string | null) {
  if (!tgl) return false;
  const d = new Date(`${tgl}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  d.setDate(d.getDate() + 7);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime() >= d.getTime();
}

function ReminderButton({ row }: { row: any }) {
  const send = useServerFn(sendReminderWa);
  const [busy, setBusy] = useState(false);
  const petugas = (row.detail_petugas ?? [])
    .map((d: any) => d.master_user)
    .filter(Boolean);
  const withWa = petugas.filter((p: any) => (p?.no_wa ?? "").trim());

  const onClick = async () => {
    if (withWa.length === 0) {
      toast.warning(
        "Belum ada petugas dengan No. WhatsApp. Lengkapi di Data Master → User Pegawai.",
      );
      return;
    }
    setBusy(true);
    try {
      const res: any = await send({ data: { id_lpd: row.id_lpd } });
      if (res.sent > 0) {
        toast.success(`Reminder terkirim ke ${res.sent} dari ${res.total} nomor`);
      }
      const gagal = (res.results ?? []).filter((r: any) => !r.ok);
      if (gagal.length > 0) {
        toast.error(
          `Gagal ke ${gagal.length} nomor: ${gagal.map((g: any) => `${g.nama} (${g.error ?? "gagal"})`).join(", ")}`,
        );
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal mengirim reminder");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      disabled={busy}
      className="gap-1 whitespace-nowrap"
    >
      <span className="material-symbols-outlined !text-[16px]">sms</span>
      {busy ? "Mengirim…" : "Reminder WA"}
    </Button>
  );
}

const searchSchema = z.object({
  page: fallback(z.number().int().min(1), 1).default(1),
  status: fallback(z.enum(["all", "Belum", "Sudah", "Batal"]), "all").default("all"),
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/_authenticated/lpd/")({
  validateSearch: zodValidator(searchSchema),
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
  const { page, status, q: searchParam } = Route.useSearch();
  const navigate = useNavigate({ from: "/lpd/" });
  const fetchList = useServerFn(listLpd);

  // Debounced input untuk search agar tiap ketikan tidak refetch.
  const [searchInput, setSearchInput] = useState(searchParam);
  useEffect(() => setSearchInput(searchParam), [searchParam]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== searchParam) {
        navigate({ search: (p: any) => ({ ...p, q: searchInput, page: 1 }) });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, searchParam, navigate]);

  const query = useQuery({
    queryKey: ["lpd-list", status, searchParam, page],
    queryFn: () =>
      fetchList({
        data: {
          page,
          pageSize: PAGE_SIZE,
          status: status === "all" ? undefined : (status as "Belum" | "Sudah" | "Batal"),
          search: searchParam || undefined,
        },
      }),
    enabled: !!me,
    placeholderData: keepPreviousData,
  });

  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const setStatus = (s: (typeof FILTERS)[number]["key"]) =>
    navigate({ search: (p: any) => ({ ...p, status: s, page: 1 }) });
  const setPage = (n: number) =>
    navigate({ search: (p: any) => ({ ...p, page: n }) });

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
        <div className="flex gap-2 items-center w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 !text-[18px] text-on-surface-variant">
              search
            </span>
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nomor surat…"
              className="pl-9 w-full md:w-64"
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
              {query.isLoading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-on-surface-variant">
                    Memuat…
                  </td>
                </tr>
              )}
              {!query.isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-on-surface-variant">
                    Tidak ada data.
                  </td>
                </tr>
              )}
              {rows.map((row: any) => (
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
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {me?.role_user === "Admin" &&
                        row.status_lpd === "Belum" &&
                        isPastH7(row.tgl_kegiatan) && <ReminderButton row={row} />}
                      <Link
                        to="/lpd/$id"
                        params={{ id: row.id_lpd }}
                        className="text-primary text-sm font-medium hover:underline"
                      >
                        Detail
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      </section>
    </div>
  );
}
