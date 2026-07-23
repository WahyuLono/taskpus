import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listNotifikasi,
  markNotifikasiRead,
  markAllNotifikasiRead,
} from "@/lib/notifikasi.functions";
import { PaginationBar } from "@/components/ui/pagination-bar";

export const Route = createFileRoute("/_authenticated/notifikasi")({
  component: NotifikasiPage,
});

const PAGE_SIZE = 20;

const TIPE_ICON: Record<string, { icon: string; cls: string }> = {
  lpd_submitted: { icon: "assignment_turned_in", cls: "bg-secondary-container text-on-secondary-container" },
  lpd_approved: { icon: "check_circle", cls: "bg-primary/15 text-primary" },
  lpd_rejected: { icon: "cancel", cls: "bg-destructive/15 text-destructive" },
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return new Date(iso).toLocaleString("id-ID");
}

function NotifikasiPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const fetchList = useServerFn(listNotifikasi);
  const markOne = useServerFn(markNotifikasiRead);
  const markAll = useServerFn(markAllNotifikasiRead);

  const q = useQuery({
    queryKey: ["notifikasi-list", "page", page, unreadOnly],
    queryFn: () =>
      fetchList({ data: { page, pageSize: PAGE_SIZE, unreadOnly } }),
    placeholderData: keepPreviousData,
  });

  const markOneM = useMutation({
    mutationFn: (id: string) => markOne({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifikasi-unread"] });
      qc.invalidateQueries({ queryKey: ["notifikasi-list"] });
    },
  });
  const markAllM = useMutation({
    mutationFn: () => markAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifikasi-unread"] });
      qc.invalidateQueries({ queryKey: ["notifikasi-list"] });
    },
  });

  const rows = q.data?.rows ?? [];
  const total = q.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const onClickItem = (n: any) => {
    if (!n.is_read) markOneM.mutate(n.id);
    if (n.id_lpd) navigate({ to: "/lpd/$id", params: { id: n.id_lpd } });
  };

  return (
    <div className="space-y-5">
      <div className="bg-card border border-outline-variant rounded-xl shadow-card p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-on-surface">Notifikasi</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Pemberitahuan pengajuan & persetujuan Laporan Hasil Pelaksanaan Tugas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-outline-variant overflow-hidden text-sm">
            <button
              onClick={() => {
                setUnreadOnly(false);
                setPage(1);
              }}
              className={`px-3 py-1.5 ${!unreadOnly ? "bg-primary text-primary-foreground" : "bg-card text-on-surface hover:bg-surface-container"}`}
            >
              Semua
            </button>
            <button
              onClick={() => {
                setUnreadOnly(true);
                setPage(1);
              }}
              className={`px-3 py-1.5 ${unreadOnly ? "bg-primary text-primary-foreground" : "bg-card text-on-surface hover:bg-surface-container"}`}
            >
              Belum dibaca
            </button>
          </div>
          <button
            onClick={() => markAllM.mutate()}
            disabled={markAllM.isPending}
            className="text-sm px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container"
          >
            Tandai semua dibaca
          </button>
        </div>
      </div>

      <div className="bg-card border border-outline-variant rounded-xl shadow-card overflow-hidden">
        {q.isLoading && (
          <p className="p-6 text-center text-on-surface-variant">Memuat…</p>
        )}
        {!q.isLoading && rows.length === 0 && (
          <p className="p-10 text-center text-on-surface-variant">
            Tidak ada notifikasi.
          </p>
        )}
        {rows.map((n: any) => {
          const meta = TIPE_ICON[n.tipe] ?? TIPE_ICON.lpd_submitted;
          return (
            <button
              key={n.id}
              onClick={() => onClickItem(n)}
              className={`w-full text-left px-5 py-4 flex gap-3 border-b border-outline-variant/50 last:border-b-0 hover:bg-surface-container ${
                !n.is_read ? "bg-primary/5" : ""
              }`}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${meta.cls}`}>
                <span className="material-symbols-outlined !text-[20px]">{meta.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-on-surface">{n.judul}</p>
                  {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />}
                </div>
                <p className="text-sm text-on-surface-variant mt-0.5">{n.pesan}</p>
                <p className="text-xs text-on-surface-variant mt-1">{timeAgo(n.created_at)}</p>
              </div>
            </button>
          );
        })}
        {total > 0 && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
