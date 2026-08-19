import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getLpdDetail,
  submitLaporan,
  approveLpd,
  rejectLpd,
} from "@/lib/lpd.functions";
import { StatusBadge } from "@/components/lpd/status-badge";
import { formatDate, formatDateRange, formatNip } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import imageCompression from "browser-image-compression";

const COMPRESSION_OPTS = {
  maxSizeMB: 0.25,
  maxWidthOrHeight: 1920,
  initialQuality: 0.8,
  useWebWorker: true,
  fileType: "image/jpeg" as const,
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export const Route = createFileRoute("/_authenticated/lpd/$id")({
  component: LpdDetailPage,
});

const MAX_FOTO_MB = 5;
const FIELD_MAX = 500;

type LaporanForm = {
  alat: string;
  metode: string;
  lama_kegiatan: string;
  sasaran: string;
  hambatan: string;
  output: string;
  tindak_lanjut: string;
};

const EMPTY_LAPORAN: LaporanForm = {
  alat: "",
  metode: "",
  lama_kegiatan: "",
  sasaran: "",
  hambatan: "",
  output: "",
  tindak_lanjut: "",
};

function readLaporan(lpd: any): LaporanForm | null {
  const out: LaporanForm = {
    alat: lpd.input_alat ?? "",
    metode: lpd.input_metode ?? "",
    lama_kegiatan: lpd.input_lama_kegiatan ?? "",
    sasaran: lpd.proses_sasaran ?? "",
    hambatan: lpd.proses_hambatan ?? "",
    output: lpd.output ?? "",
    tindak_lanjut: lpd.tindak_lanjut ?? "",
  };
  const anyFilled = (Object.values(out) as string[]).some((v) => v.trim().length > 0);
  return anyFilled ? out : null;
}

function LpdDetailPage() {
  const { id } = Route.useParams();
  const fetchDetail = useServerFn(getLpdDetail);
  const { data: me } = useCurrentUser();
  const isAdmin = me?.role_user === "Admin";
  const q = useQuery({
    queryKey: ["lpd-detail", id],
    queryFn: () => fetchDetail({ data: { id } }),
  });

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 text-on-surface-variant py-12 justify-center">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        Memuat detail LPD…
      </div>
    );
  }
  if (q.isError) {
    return (
      <div className="bg-card border border-destructive/30 rounded-xl p-6 text-center">
        <p className="font-semibold text-destructive">Gagal memuat data</p>
        <p className="text-sm text-on-surface-variant mt-1">
          {(q.error as Error).message}
        </p>
        <Button onClick={() => q.refetch()} className="mt-4">
          Coba lagi
        </Button>
      </div>
    );
  }
  if (!q.data) return null;

  const { lpd, petugas } = q.data as { lpd: any; petugas: any[] };
  const isPetugasOfThisLpd =
    !!me && petugas.some((p) => p.id_user === me.id_user);
  const approval = lpd.approval_status as
    | "Draft"
    | "Menunggu"
    | "Disetujui"
    | "Ditolak"
    | undefined;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/lpd" className="text-sm text-on-surface-variant hover:text-primary">
          ← Daftar LPD
        </Link>
      </div>

      {/* Action Bar */}
      <div className="bg-card rounded-xl border border-outline-variant shadow-card p-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-on-surface-variant">
            Surat Perintah Tugas
          </p>
          <h1 className="text-2xl font-bold text-on-surface mt-1">{lpd.no_surat}</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <StatusBadge status={lpd.status_lpd} />
            <span className="text-xs text-on-surface-variant">
              Dibuat {formatDate(lpd.tgl_buat, true)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              {lpd.status_lpd === "Belum" && approval === "Draft" && (
                <Link
                  to="/lpd/$id/edit"
                  params={{ id }}
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-md border border-outline-variant bg-card text-on-surface text-sm font-semibold hover:bg-primary/5"
                >
                  <span className="material-symbols-outlined !text-[20px]">edit</span>
                  Edit SPT
                </Link>
              )}
              <a
                href={`/print/lpd/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-card"
              >
                <span className="material-symbols-outlined !text-[20px]">print</span>
                Cetak Surat Tugas (ST)
              </a>
            </>
          )}
          {!isAdmin && isPetugasOfThisLpd && approval === "Disetujui" && (
            <a
              href={`/print/laporan/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-card"
            >
              <span className="material-symbols-outlined !text-[20px]">print</span>
              Cetak LPD
            </a>
          )}
        </div>
      </div>

      {/* Approval Banner */}
      <ApprovalBanner
        approval={approval}
        catatanReject={lpd.catatan_reject}
        approvedAt={lpd.approved_at}
        isAdmin={isAdmin}
        isPetugas={isPetugasOfThisLpd}
      />

      {/* Admin Review Panel */}
      {isAdmin && approval === "Menunggu" && (
        <AdminReviewPanel id={id} />
      )}

      {/* Info Perjalanan */}
      <section className="bg-card rounded-xl border border-outline-variant shadow-card p-6">
        <h2 className="font-semibold text-on-surface mb-4">Informasi Perjalanan</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Jenis Perjalanan Dinas" value={lpd.jenis_perjadin} />
          <Field label="Dalam Rangka" value={lpd.master_rangka?.nama_rangka ?? "—"} />
          <Field label="Tempat" value={lpd.master_tempat?.nama_tempat ?? "—"} />
          <Field
            label="Tanggal Kegiatan"
            value={formatDateRange(lpd.tgl_kegiatan, lpd.tgl_selesai)}
          />
          <Field label="Lama" value={`${lpd.lama_hari} hari`} />
          <Field
            label="Kepala UPTD (penandatangan)"
            value={
              lpd.kepala
                ? `${lpd.kepala.nama} • NIP ${formatNip(lpd.kepala.nip)}`
                : "—"
            }
          />
        </div>
      </section>

      {/* Petugas */}
      <section className="bg-card rounded-xl border border-outline-variant shadow-card p-6">
        <h2 className="font-semibold text-on-surface mb-4">
          Daftar Petugas Yang Ditugaskan
          <span className="ml-2 text-xs font-normal text-on-surface-variant">
            ({petugas.length} orang)
          </span>
        </h2>
        {petugas.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Belum ada petugas.</p>
        ) : petugas.length === 1 ? (
          <PetugasSingleCard p={petugas[0]} />
        ) : (
          <div className="space-y-5">
            {petugas.map((p, i) => (
              <PetugasNumberedRow key={p.id_user} index={i + 1} p={p} />
            ))}
          </div>
        )}
      </section>

      {/* Laporan Hasil */}
      <LaporanSection lpd={lpd} id={id} petugasCount={petugas.length} />
    </div>
  );
}

function ApprovalBanner({
  approval,
  catatanReject,
  approvedAt,
  isAdmin,
  isPetugas,
}: {
  approval?: "Draft" | "Menunggu" | "Disetujui" | "Ditolak";
  catatanReject?: string | null;
  approvedAt?: string | null;
  isAdmin: boolean;
  isPetugas: boolean;
}) {
  if (!approval || approval === "Draft") return null;

  const styles: Record<string, string> = {
    Menunggu: "bg-amber-50 border-amber-200 text-amber-900",
    Disetujui: "bg-emerald-50 border-emerald-200 text-emerald-900",
    Ditolak: "bg-red-50 border-red-200 text-red-900",
  };
  const icons: Record<string, string> = {
    Menunggu: "hourglass_top",
    Disetujui: "verified",
    Ditolak: "block",
  };
  const titles: Record<string, string> = {
    Menunggu: "Menunggu persetujuan Admin",
    Disetujui: "Laporan telah disetujui",
    Ditolak: "Laporan ditolak — revisi diperlukan",
  };
  const descs: Record<string, string> = {
    Menunggu: isAdmin
      ? "Silakan review laporan dan pilih Setujui atau Tolak."
      : "Laporan Anda telah dikirim. Anda belum dapat mengubah isian sampai Admin menyelesaikan review.",
    Disetujui: approvedAt
      ? `Disetujui pada ${formatDate(approvedAt, true)}.${isPetugas ? " Anda dapat mencetak LPD." : ""}`
      : "Laporan telah disetujui.",
    Ditolak:
      "Silakan perbaiki isian laporan sesuai catatan di bawah, lalu simpan kembali untuk dikirim ulang ke Admin.",
  };

  return (
    <div
      className={cn(
        "rounded-xl border px-5 py-4 flex items-start gap-3",
        styles[approval],
      )}
    >
      <span className="material-symbols-outlined !text-[24px] mt-0.5">
        {icons[approval]}
      </span>
      <div className="flex-1">
        <p className="font-semibold">{titles[approval]}</p>
        <p className="text-sm mt-1 opacity-90">{descs[approval]}</p>
        {approval === "Ditolak" && catatanReject && (
          <div className="mt-3 bg-white/70 border border-red-200 rounded-md p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-1">
              Catatan Admin
            </p>
            <p className="whitespace-pre-line text-red-900">{catatanReject}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminReviewPanel({ id }: { id: string }) {
  const qc = useQueryClient();
  const approveFn = useServerFn(approveLpd);
  const rejectFn = useServerFn(rejectLpd);
  const [open, setOpen] = useState(false);
  const [catatan, setCatatan] = useState("");

  const approveMut = useMutation({
    mutationFn: () => approveFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Laporan disetujui");
      qc.invalidateQueries({ queryKey: ["lpd-detail", id] });
      qc.invalidateQueries({ queryKey: ["lpd-list"] });
    },
    onError: (e: Error) => toast.error("Gagal menyetujui", { description: e.message }),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectFn({ data: { id, catatan: catatan.trim() } }),
    onSuccess: () => {
      toast.success("Laporan ditolak", { description: "Petugas dapat melakukan revisi." });
      setOpen(false);
      setCatatan("");
      qc.invalidateQueries({ queryKey: ["lpd-detail", id] });
      qc.invalidateQueries({ queryKey: ["lpd-list"] });
    },
    onError: (e: Error) => toast.error("Gagal menolak", { description: e.message }),
  });

  return (
    <div className="bg-card rounded-xl border border-outline-variant shadow-card p-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-semibold text-on-surface">Review laporan</p>
        <p className="text-sm text-on-surface-variant mt-0.5">
          Periksa isian A–D dan dokumentasi sebelum memutuskan.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          disabled={approveMut.isPending}
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <span className="material-symbols-outlined !text-[18px]">close</span>
          Tolak
        </Button>
        <Button
          onClick={() => approveMut.mutate()}
          disabled={approveMut.isPending || rejectMut.isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <span className="material-symbols-outlined !text-[18px]">check</span>
          {approveMut.isPending ? "Menyetujui…" : "Setujui"}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => !rejectMut.isPending && setOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak laporan</DialogTitle>
            <DialogDescription>
              Tuliskan alasan penolakan. Catatan ini akan dilihat oleh petugas saat
              merevisi laporan.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Contoh: Bagian Hambatan belum spesifik, mohon dijelaskan lebih detail…"
          />
          <div className="text-xs text-on-surface-variant text-right tabular-nums">
            {catatan.trim().length} / 500 (minimal 3)
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={rejectMut.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMut.mutate()}
              disabled={rejectMut.isPending || catatan.trim().length < 3}
            >
              {rejectMut.isPending ? "Menolak…" : "Tolak laporan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

const FIELD_LABELS: { key: string; label: string }[] = [
  { key: "nama", label: "Nama" },
  { key: "nip", label: "NIP" },
  { key: "pangkat", label: "Pangkat / Golongan" },
  { key: "jabatan", label: "Jabatan" },
  { key: "unit", label: "Unit" },
];

function getPetugasValue(p: any, key: string): string {
  if (key === "nama") return p.nama ?? "—";
  if (key === "nip") return p.nip ? formatNip(p.nip) : "—";
  if (key === "pangkat") return p.master_golongan?.nama_golongan ?? "—";
  if (key === "jabatan") return p.jabatan ?? "—";
  if (key === "unit") return p.unit ?? "—";
  return "—";
}

function PetugasSingleCard({ p }: { p: any }) {
  return (
    <div className="border border-outline-variant rounded-lg p-5 bg-surface-container-low">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
          {(p.nama ?? "?").slice(0, 1)}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-on-surface-variant">
            Petugas Ditugaskan
          </p>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
            {p.status_kepegawaian}
          </span>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        {FIELD_LABELS.map((f) => (
          <div
            key={f.key}
            className="grid items-baseline"
            style={{ gridTemplateColumns: "160px 12px 1fr" }}
          >
            <span className="text-on-surface-variant">{f.label}</span>
            <span className="text-on-surface-variant">:</span>
            <span
              className={cn(
                "font-medium text-on-surface",
                f.key === "nip" && "font-mono tabular-nums",
              )}
            >
              {getPetugasValue(p, f.key)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PetugasNumberedRow({ index, p }: { index: number; p: any }) {
  return (
    <div className="border border-outline-variant rounded-lg p-4 bg-surface-container-low">
      <div className="flex items-start gap-4">
        <div className="h-8 w-8 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
          {index}
        </div>
        <div className="flex-1 space-y-1.5 text-sm">
          {FIELD_LABELS.map((f) => (
            <div
              key={f.key}
              className="grid items-baseline"
              style={{ gridTemplateColumns: "160px 12px 1fr" }}
            >
              <span className="text-on-surface-variant">{f.label}</span>
              <span className="text-on-surface-variant">:</span>
              <span
                className={cn(
                  "font-medium text-on-surface",
                  f.key === "nip" && "font-mono tabular-nums",
                )}
              >
                {getPetugasValue(p, f.key)}
              </span>
            </div>
          ))}
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant shrink-0">
          {p.status_kepegawaian}
        </span>
      </div>
    </div>
  );
}

function LaporanSection({
  lpd,
  id,
  petugasCount,
}: {
  lpd: any;
  id: string;
  petugasCount: number;
}) {
  if (lpd.status_lpd === "Batal") {
    return (
      <section className="bg-card rounded-xl border border-outline-variant shadow-card p-6">
        <h2 className="font-semibold text-on-surface mb-2">
          Laporan Hasil Pelaksanaan Tugas
        </h2>
        <p className="text-sm text-on-surface-variant">LPD ini telah dibatalkan.</p>
      </section>
    );
  }
  // Lock the form once it's awaiting review or approved
  if (lpd.approval_status === "Menunggu" || lpd.approval_status === "Disetujui") {
    return <LaporanReadonly lpd={lpd} petugasCount={petugasCount} />;
  }
  // Draft (new) or Ditolak (revision) → editable form, pre-filled if data exists
  return <LaporanFormView id={id} lpd={lpd} petugasCount={petugasCount} />;
}

// ----- Locked auto-field row -----
function LockedRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-on-surface-variant font-semibold mb-1">
        {label}
      </p>
      <div className="flex items-center gap-2 rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface">
        <span className="material-symbols-outlined !text-[16px] text-on-surface-variant">
          lock
        </span>
        <span className="font-medium">{value}</span>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-on-surface-variant">
          Otomatis
        </span>
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-on-surface-variant font-semibold">
        {label}
      </label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        maxLength={FIELD_MAX}
        disabled={disabled}
        className="mt-1.5"
      />
      <div className="flex justify-end mt-1 text-xs text-on-surface-variant tabular-nums">
        {value.length} / {FIELD_MAX}
      </div>
    </div>
  );
}

function GroupHeading({ label, title }: { label: string; title: string }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-outline-variant pb-2">
      <span className="text-lg font-bold text-primary">{label}.</span>
      <h3 className="font-semibold text-on-surface">{title}</h3>
    </div>
  );
}

function ReadonlyText({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-on-surface-variant font-semibold mb-1">
        {label}
      </p>
      <p className="text-sm whitespace-pre-line text-on-surface leading-relaxed">
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}

function LaporanReadonly({
  lpd,
  petugasCount,
}: {
  lpd: any;
  petugasCount: number;
}) {
  const paths: string[] = [lpd.url_foto, lpd.url_foto_2].filter(Boolean);
  const pathsKey = paths.join("|");
  const [signedUrls, setSignedUrls] = useState<string[]>([]);
  useEffect(() => {
    if (paths.length === 0) return;
    let cancel = false;
    Promise.all(
      paths.map((p) =>
        supabase.storage
          .from("laporan_lpd")
          .createSignedUrl(p, 3600)
          .then(({ data }) => data?.signedUrl ?? null),
      ),
    ).then((urls) => {
      if (!cancel) setSignedUrls(urls.filter((u): u is string => !!u));
    });
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathsKey]);

  const parsed = readLaporan(lpd);
  const jadwal = formatDate(lpd.tgl_kegiatan);
  const tempat = lpd.master_tempat?.nama_tempat ?? "—";

  return (
    <section className="bg-card rounded-xl border border-outline-variant shadow-card p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold text-on-surface">
          Laporan Hasil Pelaksanaan Tugas
        </h2>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
          <span className="material-symbols-outlined !text-[14px]">check_circle</span>
          Sudah Dilaporkan
        </span>
      </div>

      {parsed ? (
        <div className="space-y-6">
          <div className="space-y-4">
            <GroupHeading label="A" title="Input" />
            <ReadonlyText label="1. Pelaksana Kegiatan" value={`${petugasCount} Orang`} />
            <ReadonlyText label="2. Sumber Dana" value="BOK" />
            <ReadonlyText label="3. Alat yang Digunakan" value={parsed.alat} />
            <ReadonlyText label="4. Metode" value={parsed.metode} />
            <ReadonlyText label="5. Lama Kegiatan" value={parsed.lama_kegiatan} />
          </div>
          <div className="space-y-4">
            <GroupHeading label="B" title="Proses" />
            <ReadonlyText label="1. Sasaran" value={parsed.sasaran} />
            <ReadonlyText label="2. Jadwal" value={jadwal} />
            <ReadonlyText label="3. Tempat Pelaksanaan" value={tempat} />
            <ReadonlyText label="4. Hambatan" value={parsed.hambatan} />
          </div>
          <div className="space-y-4">
            <GroupHeading label="C" title="Output" />
            <ReadonlyText label="Output" value={parsed.output} />
          </div>
          <div className="space-y-4">
            <GroupHeading label="D" title="Tindak Lanjut" />
            <ReadonlyText label="Tindak Lanjut" value={parsed.tindak_lanjut} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">Laporan belum diisi.</p>
      )}

      {lpd.url_foto && (
        <div>
          <p className="text-xs uppercase tracking-wide text-on-surface-variant font-semibold mb-2">
            Dokumentasi
          </p>
          {signedUrl ? (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block aspect-video w-full max-w-2xl rounded-lg overflow-hidden border border-outline-variant bg-surface-container-low"
            >
              <img
                src={signedUrl}
                alt="Dokumentasi kegiatan"
                className="w-full h-full object-cover"
              />
            </a>
          ) : (
            <p className="text-xs text-on-surface-variant">Memuat foto…</p>
          )}
        </div>
      )}
    </section>
  );
}

function LaporanFormView({
  id,
  lpd,
  petugasCount,
}: {
  id: string;
  lpd: any;
  petugasCount: number;
}) {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const submit = useServerFn(submitLaporan);
  const fileRef = useRef<HTMLInputElement>(null);
  const initial = readLaporan(lpd) ?? EMPTY_LAPORAN;
  const [form, setForm] = useState<LaporanForm>(initial);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const hasExistingFoto = !!lpd.url_foto;
  const isRevision = lpd.approval_status === "Ditolak";

  // Load existing foto preview (signed URL) for revisions
  useEffect(() => {
    if (!hasExistingFoto || preview) return;
    let cancel = false;
    supabase.storage
      .from("laporan_lpd")
      .createSignedUrl(lpd.url_foto, 3600)
      .then(({ data }) => {
        if (!cancel && data?.signedUrl) setPreview(data.signedUrl);
      });
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lpd.url_foto]);

  const jadwal = formatDate(lpd.tgl_kegiatan);
  const tempat = lpd.master_tempat?.nama_tempat ?? "—";

  const setField = (key: keyof LaporanForm) => (v: string) =>
    setForm((s) => ({ ...s, [key]: v }));

  const allFilled = (Object.keys(EMPTY_LAPORAN) as (keyof LaporanForm)[]).every(
    (k) => form[k].trim().length >= 1,
  );
  const canSubmit = allFilled && (!!file || hasExistingFoto);

  const handleFile = async (f: File | null) => {
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (/heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name)) {
      toast.error("Format HEIC tidak didukung", {
        description: "Silakan konversi ke JPG/PNG terlebih dahulu.",
      });
      return;
    }
    if (!f.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (f.size > MAX_FOTO_MB * 1024 * 1024) {
      toast.error(`Ukuran file maksimal ${MAX_FOTO_MB}MB`);
      return;
    }

    const tId = toast.loading("Mengompres foto…");
    try {
      const compressed = await imageCompression(f, COMPRESSION_OPTS);
      const finalFile = new File(
        [compressed],
        f.name.replace(/\.[^.]+$/, "") + ".jpg",
        { type: "image/jpeg" },
      );
      toast.success("Foto siap diunggah", {
        id: tId,
        description: `${formatBytes(f.size)} → ${formatBytes(finalFile.size)}`,
      });
      setFile(finalFile);
      setPreview(URL.createObjectURL(finalFile));
    } catch (err) {
      toast.warning("Kompresi gagal, memakai file asli", {
        id: tId,
        description: (err as Error).message,
      });
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const mut = useMutation({
    mutationFn: async () => {
      let path = lpd.url_foto as string | null;
      if (file) {
        const tahun = new Date(lpd.tgl_buat).getFullYear();
        const bulan = String(new Date(lpd.tgl_buat).getMonth() + 1).padStart(2, "0");
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        path = `${tahun}/${bulan}/${lpd.no_surat_slug}/foto-${Date.now()}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("laporan_lpd")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) throw new Error(`Upload gagal: ${upErr.message}`);
      }
      if (!path) throw new Error("Foto belum dipilih");

      await submit({
        data: {
          id,
          url_foto: path,
          laporan: {
            alat: form.alat.trim(),
            metode: form.metode.trim(),
            lama_kegiatan: form.lama_kegiatan.trim(),
            sasaran: form.sasaran.trim(),
            hambatan: form.hambatan.trim(),
            output: form.output.trim(),
            tindak_lanjut: form.tindak_lanjut.trim(),
          },
        },
      });
    },
    onSuccess: () => {
      toast.success("Laporan tersimpan", {
        description: "Menunggu persetujuan Admin.",
      });
      qc.invalidateQueries({ queryKey: ["lpd-detail", id] });
      qc.invalidateQueries({ queryKey: ["lpd-list"] });
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
    },
    onError: (e: Error) => toast.error("Gagal menyimpan", { description: e.message }),
  });

  void me;

  return (
    <section className="bg-card rounded-xl border border-outline-variant shadow-card p-6 space-y-6">
      <div>
        <h2 className="font-semibold text-on-surface">
          {isRevision ? "Revisi Laporan" : "Laporan Hasil Pelaksanaan Tugas"}
        </h2>
        <p className="text-xs text-on-surface-variant mt-1">
          Lengkapi seluruh isian laporan dan unggah satu foto dokumentasi. Setelah
          disimpan, laporan akan dikirim ke Admin untuk persetujuan.

        </p>
      </div>

      {/* A. Input */}
      <div className="space-y-4">
        <GroupHeading label="A" title="Input" />
        <LockedRow label="1. Pelaksana Kegiatan" value={`${petugasCount} Orang`} />
        <LockedRow label="2. Sumber Dana" value="BOK" />
        <EditableField
          label="3. Alat yang Digunakan"
          value={form.alat}
          onChange={setField("alat")}
          placeholder="Contoh: tensimeter, stetoskop, alat tulis…"
        />
        <EditableField
          label="4. Metode"
          value={form.metode}
          onChange={setField("metode")}
          placeholder="Contoh: penyuluhan, pemeriksaan langsung, wawancara…"
        />
        <EditableField
          label="5. Lama Kegiatan"
          value={form.lama_kegiatan}
          onChange={setField("lama_kegiatan")}
          placeholder="Contoh: 2 jam, ±90 menit…"
        />
      </div>

      {/* B. Proses */}
      <div className="space-y-4">
        <GroupHeading label="B" title="Proses" />
        <EditableField
          label="1. Sasaran"
          value={form.sasaran}
          onChange={setField("sasaran")}
          placeholder="Kelompok / individu yang menjadi sasaran kegiatan"
        />
        <LockedRow label="2. Jadwal" value={jadwal} />
        <LockedRow label="3. Tempat Pelaksanaan" value={tempat} />
        <EditableField
          label="4. Hambatan"
          value={form.hambatan}
          onChange={setField("hambatan")}
          placeholder="Hambatan yang dijumpai selama kegiatan"
        />
      </div>

      {/* C. Output */}
      <div className="space-y-4">
        <GroupHeading label="C" title="Output" />
        <EditableField
          label="Output"
          value={form.output}
          onChange={setField("output")}
          placeholder="Hasil / capaian dari kegiatan"
          rows={3}
        />
      </div>

      {/* D. Tindak Lanjut */}
      <div className="space-y-4">
        <GroupHeading label="D" title="Tindak Lanjut" />
        <EditableField
          label="Tindak Lanjut"
          value={form.tindak_lanjut}
          onChange={setField("tindak_lanjut")}
          placeholder="Rencana tindak lanjut setelah kegiatan"
          rows={3}
        />
      </div>

      {/* Foto Dokumentasi */}
      <div>
        <label className="text-xs uppercase tracking-wide text-on-surface-variant font-semibold">
          Foto Dokumentasi
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0] ?? null);
          }}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "mt-1.5 border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors text-center",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-outline-variant hover:border-primary/50 hover:bg-surface-container-low",
          )}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {preview ? (
            <div className="flex items-center gap-4">
              <img
                src={preview}
                alt="preview"
                className="h-24 w-24 object-cover rounded-md border border-outline-variant"
              />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-on-surface">{file?.name}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {((file?.size ?? 0) / 1024).toFixed(0)} KB — klik untuk ganti
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFile(null);
                }}
                className="text-xs text-destructive hover:underline"
              >
                Hapus
              </button>
            </div>
          ) : (
            <>
              <span className="material-symbols-outlined !text-[36px] text-on-surface-variant">
                cloud_upload
              </span>
              <p className="text-sm font-medium text-on-surface mt-1">
                Tarik & lepas foto di sini, atau klik untuk pilih
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                JPG / PNG, maksimal {MAX_FOTO_MB}MB
              </p>
            </>
          )}
        </div>
      </div>

      {!canSubmit && (
        <p className="text-xs text-destructive">
          {allFilled
            ? "Foto dokumentasi belum dipilih."
            : "Semua isian laporan wajib diisi."}
        </p>
      )}

      <Button
        type="button"
        disabled={!canSubmit || mut.isPending}
        onClick={() => mut.mutate()}
        className="h-11 px-6"
      >
        {mut.isPending
          ? "Menyimpan…"
          : isRevision
            ? "Simpan Revisi & Kirim Ulang"
            : "Simpan & Kirim untuk Persetujuan"}
      </Button>
    </section>
  );
}
