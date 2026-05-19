import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLpdDetail } from "@/lib/lpd.functions";
import { StatusBadge } from "@/components/lpd/status-badge";
import { formatDate, formatDateRange, formatNip } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/lpd/$id")({
  component: LpdDetailPage,
});

function LpdDetailPage() {
  const { id } = Route.useParams();
  const fetchDetail = useServerFn(getLpdDetail);
  const q = useQuery({
    queryKey: ["lpd-detail", id],
    queryFn: () => fetchDetail({ data: { id } }),
  });

  if (q.isLoading) return <p className="text-on-surface-variant">Memuat…</p>;
  if (q.isError) return <p className="text-destructive">{(q.error as Error).message}</p>;
  if (!q.data) return null;

  const { lpd, petugas } = q.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/lpd" className="text-sm text-on-surface-variant hover:text-primary">
          ← Daftar LPD
        </Link>
      </div>

      <div className="bg-card rounded-xl border border-outline-variant shadow-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-on-surface-variant">
              Nomor Surat
            </p>
            <h2 className="text-2xl font-bold text-on-surface mt-1">{(lpd as any).no_surat}</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Dibuat {formatDate((lpd as any).tgl_buat, true)}
            </p>
          </div>
          <StatusBadge status={(lpd as any).status_lpd} />
        </div>

        <div className="grid sm:grid-cols-2 gap-5 mt-6">
          <Field label="Jenis Perjalanan Dinas" value={(lpd as any).jenis_perjadin} />
          <Field
            label="Dalam Rangka"
            value={(lpd as any).master_rangka?.nama_rangka ?? "—"}
          />
          <Field label="Tempat" value={(lpd as any).master_tempat?.nama_tempat ?? "—"} />
          <Field
            label="Tanggal Kegiatan"
            value={formatDateRange((lpd as any).tgl_kegiatan, (lpd as any).tgl_selesai)}
          />
          <Field label="Lama" value={`${(lpd as any).lama_hari} hari`} />
          <Field
            label="Kepala UPTD"
            value={
              (lpd as any).kepala
                ? `${(lpd as any).kepala.nama} • NIP ${(lpd as any).kepala.nip}`
                : "—"
            }
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-outline-variant shadow-card p-6">
        <h3 className="font-semibold text-on-surface">Petugas Ditugaskan</h3>
        <div className="mt-3 divide-y divide-outline-variant">
          {petugas.length === 0 && (
            <p className="py-4 text-sm text-on-surface-variant">Belum ada petugas.</p>
          )}
          {petugas.map((p: any) => (
            <div key={p.id_user} className="py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                {p.nama.slice(0, 1)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-on-surface">{p.nama}</p>
                <p className="text-xs text-on-surface-variant">
                  NIP {p.nip} • {p.jabatan ?? "—"}
                </p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                {p.status_kepegawaian}
              </span>
            </div>
          ))}
        </div>
      </div>

      {(lpd as any).hasil_kegiatan && (
        <div className="bg-card rounded-xl border border-outline-variant shadow-card p-6">
          <h3 className="font-semibold text-on-surface mb-2">Hasil Kegiatan</h3>
          <p className="text-sm whitespace-pre-line">{(lpd as any).hasil_kegiatan}</p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-on-surface-variant font-semibold">
        {label}
      </p>
      <p className="mt-1 text-sm text-on-surface">{value}</p>
    </div>
  );
}
