import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  listNotifikasi,
  countUnreadNotifikasi,
  markNotifikasiRead,
  markAllNotifikasiRead,
} from "@/lib/notifikasi.functions";

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const TIPE_ICON: Record<string, { icon: string; cls: string }> = {
  lpd_submitted: { icon: "assignment_turned_in", cls: "bg-secondary-container text-on-secondary-container" },
  lpd_approved: { icon: "check_circle", cls: "bg-primary/15 text-primary" },
  lpd_rejected: { icon: "cancel", cls: "bg-destructive/15 text-destructive" },
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchList = useServerFn(listNotifikasi);
  const fetchUnread = useServerFn(countUnreadNotifikasi);
  const markOne = useServerFn(markNotifikasiRead);
  const markAll = useServerFn(markAllNotifikasiRead);

  const unreadQ = useQuery({
    queryKey: ["notifikasi-unread"],
    queryFn: () => fetchUnread(),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const listQ = useQuery({
    queryKey: ["notifikasi-list", "dropdown"],
    queryFn: () => fetchList({ data: { page: 1, pageSize: 8, unreadOnly: false } }),
    enabled: open,
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

  const unread = unreadQ.data?.count ?? 0;
  const rows = listQ.data?.rows ?? [];

  const onItemClick = (n: { id: string; is_read: boolean; id_lpd: string | null }) => {
    if (!n.is_read) markOneM.mutate(n.id);
    setOpen(false);
    if (n.id_lpd) navigate({ to: "/lpd/$id", params: { id: n.id_lpd } });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifikasi"
          className="relative h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface"
        >
          <span className="material-symbols-outlined">notifications</span>
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <div>
            <p className="font-semibold text-on-surface">Notifikasi</p>
            <p className="text-xs text-on-surface-variant">
              {unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}
            </p>
          </div>
          {unread > 0 && (
            <button
              onClick={() => markAllM.mutate()}
              disabled={markAllM.isPending}
              className="text-xs text-primary hover:underline font-medium"
            >
              Tandai semua dibaca
            </button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {listQ.isLoading && (
            <p className="px-4 py-6 text-sm text-on-surface-variant text-center">Memuat…</p>
          )}
          {!listQ.isLoading && rows.length === 0 && (
            <div className="px-4 py-8 text-center text-on-surface-variant">
              <span className="material-symbols-outlined !text-[32px] opacity-50">
                notifications_off
              </span>
              <p className="text-sm mt-1">Belum ada notifikasi</p>
            </div>
          )}
          {rows.map((n: any) => {
            const meta = TIPE_ICON[n.tipe] ?? TIPE_ICON.lpd_submitted;
            return (
              <button
                key={n.id}
                onClick={() => onItemClick(n)}
                className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-surface-container border-b border-outline-variant/50 last:border-b-0 ${
                  !n.is_read ? "bg-primary/5" : ""
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${meta.cls}`}
                >
                  <span className="material-symbols-outlined !text-[18px]">{meta.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-on-surface truncate">{n.judul}</p>
                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant line-clamp-2 mt-0.5">
                    {n.pesan}
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-1">
                    {timeAgo(n.created_at)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="px-4 py-2.5 border-t border-outline-variant text-center">
          <button
            onClick={() => {
              setOpen(false);
              navigate({ to: "/notifikasi" });
            }}
            className="text-sm text-primary hover:underline font-medium"
          >
            Lihat semua notifikasi
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
