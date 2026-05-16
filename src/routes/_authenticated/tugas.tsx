import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyTasks } from "@/lib/lpd.functions";
import { StatusBadge } from "@/components/lpd/status-badge";
import { formatDateRange } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/tugas")({
  component: TugasPage,
});

function TugasPage() {
  const fetchTasks = useServerFn(listMyTasks);
  const q = useQuery({ queryKey: ["my-tasks"], queryFn: () => fetchTasks() });

  return (
    <div className="space-y-5">
      <div className="bg-card border border-outline-variant rounded-xl shadow-card p-5">
        <h2 className="font-semibold text-on-surface">Tugas Ditugaskan ke Saya</h2>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Daftar SPT yang harus Anda kerjakan dan laporkan.
        </p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {q.isLoading && <p className="text-on-surface-variant">Memuat…</p>}
        {q.data?.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 bg-card border border-outline-variant rounded-xl p-10 text-center text-on-surface-variant">
            Belum ada tugas yang ditugaskan kepada Anda.
          </div>
        )}
        {q.data?.map((t: any) => (
          <Link
            key={t.id_lpd}
            to="/lpd/$id"
            params={{ id: t.id_lpd }}
            className="bg-card border border-outline-variant rounded-xl shadow-card p-5 hover:border-primary transition-colors flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-primary font-semibold">{t.no_surat}</p>
              <StatusBadge status={t.status_lpd} />
            </div>
            <p className="text-sm font-medium text-on-surface line-clamp-2">
              {t.master_rangka?.nama_rangka ?? "—"}
            </p>
            <div className="text-xs text-on-surface-variant space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined !text-[14px]">place</span>
                {t.master_tempat?.nama_tempat ?? "—"}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined !text-[14px]">event</span>
                {formatDateRange(t.tgl_kegiatan, t.tgl_selesai)} • {t.lama_hari} hari
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
