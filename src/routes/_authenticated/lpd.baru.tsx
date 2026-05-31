import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listRangka,
  listTempat,
  listKepala,
  listPetugas,
  addRangka,
  addTempat,
} from "@/lib/master.functions";
import { createLpd } from "@/lib/lpd.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/lpd/baru")({
  component: BuatSPTPage,
});

function BuatSPTPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();

  const fetchRangka = useServerFn(listRangka);
  const fetchTempat = useServerFn(listTempat);
  const fetchKepala = useServerFn(listKepala);
  const fetchPetugas = useServerFn(listPetugas);
  const submitLpd = useServerFn(createLpd);
  const submitRangka = useServerFn(addRangka);
  const submitTempat = useServerFn(addTempat);

  const enabled = !!me;
  const rangka = useQuery({ queryKey: ["rangka"], queryFn: () => fetchRangka(), enabled });
  const tempat = useQuery({ queryKey: ["tempat"], queryFn: () => fetchTempat(), enabled });
  const kepala = useQuery({ queryKey: ["kepala"], queryFn: () => fetchKepala(), enabled });
  const petugas = useQuery({ queryKey: ["petugas"], queryFn: () => fetchPetugas(), enabled });

  const today = new Date().toISOString().slice(0, 10);
  const [tglBuat, setTglBuat] = useState(today);
  const [tglKegiatan, setTglKegiatan] = useState(today);
  const [tglSelesai, setTglSelesai] = useState(today);
  const [jenis, setJenis] = useState("Perjalanan Dinas Dalam Kota");
  const [idRangka, setIdRangka] = useState<number | "">("");
  const [idTempat, setIdTempat] = useState<number | "">("");
  const [idKepala, setIdKepala] = useState<string>("");
  const [petugasIds, setPetugasIds] = useState<string[]>([]);
  const [petugasSearch, setPetugasSearch] = useState("");

  const togglePetugas = (id: string) =>
    setPetugasIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const addRangkaMut = useMutation({
    mutationFn: (nama: string) => submitRangka({ data: { nama } }),
    onSuccess: (row: any) => {
      toast.success("Dalam rangka ditambahkan");
      qc.invalidateQueries({ queryKey: ["rangka"] });
      setIdRangka(row.id_rangka);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const addTempatMut = useMutation({
    mutationFn: (nama: string) => submitTempat({ data: { nama } }),
    onSuccess: (row: any) => {
      toast.success("Tempat ditambahkan");
      qc.invalidateQueries({ queryKey: ["tempat"] });
      setIdTempat(row.id_tempat);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = useMutation({
    mutationFn: () =>
      submitLpd({
        data: {
          tgl_buat: tglBuat,
          tgl_kegiatan: tglKegiatan,
          tgl_selesai: tglSelesai,
          jenis_perjadin: jenis,
          id_rangka: Number(idRangka),
          id_tempat: Number(idTempat),
          id_kepala: idKepala,
          petugas_ids: petugasIds,
        },
      }),
    onSuccess: (res) => {
      toast.success("SPT dibuat", { description: res.no_surat });
      qc.invalidateQueries();
      navigate({ to: "/lpd/$id", params: { id: res.id_lpd } });
    },
    onError: (e: Error) => toast.error("Gagal membuat SPT", { description: e.message }),
  });

  if (me && me.role_user !== "Admin") {
    return (
      <div className="bg-card border border-outline-variant rounded-xl p-8 text-center">
        <p className="font-semibold text-on-surface">Akses ditolak</p>
        <p className="text-sm text-on-surface-variant mt-1">
          Hanya Admin yang dapat membuat Surat Perintah Tugas.
        </p>
      </div>
    );
  }

  const lamaHari =
    tglKegiatan && tglSelesai
      ? Math.max(
          1,
          Math.round(
            (new Date(tglSelesai).getTime() - new Date(tglKegiatan).getTime()) /
              86400000,
          ) + 1,
        )
      : 0;

  const valid =
    idRangka && idTempat && idKepala && petugasIds.length > 0 && jenis.trim().length >= 2;

  const petugasAll = (petugas.data ?? []) as any[];
  const selectedPetugas = petugasAll.filter((p) => petugasIds.includes(p.id_user));
  const searchTrim = petugasSearch.trim().toLowerCase();
  const filteredPetugas = searchTrim
    ? petugasAll.filter(
        (p) =>
          !petugasIds.includes(p.id_user) &&
          `${p.nama} ${p.nip ?? ""} ${p.username ?? ""}`.toLowerCase().includes(searchTrim),
      )
    : [];

  return (
    <form
      className="grid lg:grid-cols-3 gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate();
      }}
    >
      <div className="lg:col-span-2 space-y-5">
        <Section title="Informasi Surat" subtitle="Tanggal dan jenis perjalanan dinas">
          <div className="grid sm:grid-cols-2 gap-4">
            <Fld label="Tanggal Buat Surat">
              <Input type="date" value={tglBuat} onChange={(e) => setTglBuat(e.target.value)} required />
            </Fld>
            <Fld label="Jenis Perjalanan Dinas">
              <select
                value={jenis}
                onChange={(e) => setJenis(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option>Perjalanan Dinas Dalam Kota</option>
                <option>Perjalanan Dinas Luar Kota</option>
              </select>
            </Fld>
            <Fld label="Tanggal Kegiatan Mulai">
              <Input
                type="date"
                value={tglKegiatan}
                onChange={(e) => {
                  setTglKegiatan(e.target.value);
                  if (tglSelesai < e.target.value) setTglSelesai(e.target.value);
                }}
                required
              />
            </Fld>
            <Fld label="Tanggal Kegiatan Selesai">
              <Input
                type="date"
                value={tglSelesai}
                min={tglKegiatan}
                onChange={(e) => setTglSelesai(e.target.value)}
                required
              />
            </Fld>
            <Fld label="Lama Hari (otomatis)">
              <Input value={lamaHari ? `${lamaHari} hari` : ""} readOnly className="bg-surface-container-low" />
            </Fld>
          </div>
        </Section>

        <Section title="Substansi" subtitle="Dalam rangka, tempat, dan pejabat penandatangan">
          <div className="grid sm:grid-cols-2 gap-4">
            <Fld label="Dalam Rangka">
              <QuickSelect
                value={idRangka}
                options={(rangka.data ?? []).map((r: any) => ({
                  value: r.id_rangka,
                  label: r.nama_rangka,
                }))}
                onChange={(v) => setIdRangka(v as number)}
                onAdd={(nama) => addRangkaMut.mutate(nama)}
                placeholder="Pilih atau ketik untuk menambah…"
                adding={addRangkaMut.isPending}
              />
            </Fld>
            <Fld label="Tempat">
              <QuickSelect
                value={idTempat}
                options={(tempat.data ?? []).map((r: any) => ({
                  value: r.id_tempat,
                  label: r.nama_tempat,
                }))}
                onChange={(v) => setIdTempat(v as number)}
                onAdd={(nama) => addTempatMut.mutate(nama)}
                placeholder="Pilih atau ketik untuk menambah…"
                adding={addTempatMut.isPending}
              />
            </Fld>
            <Fld label="Kepala UPTD (penandatangan)">
              <select
                value={idKepala}
                onChange={(e) => setIdKepala(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">— Pilih Kepala UPTD —</option>
                {kepala.data?.map((k: any) => (
                  <option key={k.id_user} value={k.id_user}>
                    {k.nama} — NIP {k.nip ?? "-"}
                  </option>
                ))}
              </select>
            </Fld>
          </div>
        </Section>

        <Section
          title="Petugas Ditugaskan"
          subtitle={`Dipilih: ${petugasIds.length} orang`}
        >
          {selectedPetugas.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedPetugas.map((p: any) => (
                <span
                  key={p.id_user}
                  className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                >
                  {p.nama}
                  <button
                    type="button"
                    onClick={() => togglePetugas(p.id_user)}
                    className="grid place-content-center h-5 w-5 rounded-full hover:bg-primary/20"
                    aria-label={`Hapus ${p.nama}`}
                  >
                    <span className="material-symbols-outlined !text-[14px]">close</span>
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="mb-3 text-xs text-on-surface-variant">Belum ada petugas dipilih.</p>
          )}
          <Input
            value={petugasSearch}
            onChange={(e) => setPetugasSearch(e.target.value)}
            placeholder="Cari nama atau NIP…"
          />
          {searchTrim ? (
            <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-outline-variant border border-outline-variant rounded-md">
              {filteredPetugas.length === 0 && (
                <p className="p-4 text-sm text-on-surface-variant">Tidak ada pegawai cocok.</p>
              )}
              {filteredPetugas.map((p: any) => (
                <label
                  key={p.id_user}
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-primary/5"
                >
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => {
                      togglePetugas(p.id_user);
                      setPetugasSearch("");
                    }}
                    className="h-4 w-4 accent-primary"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{p.nama}</p>
                    <p className="text-xs text-on-surface-variant">
                      NIP {p.nip ?? "-"} • {p.jabatan ?? "—"}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                    {p.status_kepegawaian}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-on-surface-variant">
              Ketik nama atau NIP untuk mencari petugas.
            </p>
          )}
        </Section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-[88px] self-start">
        <div className="bg-card border border-outline-variant rounded-xl p-5 shadow-card">
          <h3 className="font-semibold text-on-surface">Ringkasan</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="Tanggal Buat" v={tglBuat} />
            <Row k="Jenis" v={jenis} />
            <Row k="Lama" v={lamaHari ? `${lamaHari} hari` : "—"} />
            <Row k="Petugas" v={`${petugasIds.length} orang`} />
          </dl>
          <Button
            type="submit"
            className="w-full h-11 mt-5"
            disabled={!valid || submit.isPending}
          >
            {submit.isPending ? "Memproses…" : "Buat SPT"}
          </Button>
          <p className="text-[11px] text-on-surface-variant mt-2 text-center">
            Nomor surat akan digenerate otomatis.
          </p>
        </div>
      </aside>
    </form>
  );
}

export function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-outline-variant rounded-xl shadow-card p-5">
      <header className="mb-4">
        <h3 className="font-semibold text-on-surface">{title}</h3>
        {subtitle && <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

export function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-on-surface-variant">{k}</dt>
      <dd className="font-medium text-on-surface text-right">{v}</dd>
    </div>
  );
}

export function QuickSelect({
  value,
  options,
  onChange,
  onAdd,
  placeholder,
  adding,
}: {
  value: number | "";
  options: { value: number; label: string }[];
  onChange: (v: number | "") => void;
  onAdd: (nama: string) => void;
  placeholder: string;
  adding: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  const exact = options.some((o) => o.label.toLowerCase() === q.trim().toLowerCase());

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-left flex items-center justify-between"
      >
        <span className={current ? "text-on-surface" : "text-on-surface-variant"}>
          {current?.label ?? placeholder}
        </span>
        <span className="material-symbols-outlined !text-[18px] text-on-surface-variant">
          expand_more
        </span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-popover border border-outline-variant rounded-md shadow-floating max-h-72 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-outline-variant">
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari atau ketik baru…"
              className="h-9"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setQ("");
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-primary/5",
                  o.value === value && "bg-primary/10 text-primary font-medium",
                )}
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-on-surface-variant">Tidak ada hasil.</p>
            )}
          </div>
          {q.trim() && !exact && (
            <button
              type="button"
              disabled={adding}
              onClick={() => {
                onAdd(q.trim());
                setOpen(false);
                setQ("");
              }}
              className="border-t border-outline-variant px-3 py-2 text-sm text-primary font-medium hover:bg-primary/5 disabled:opacity-60 flex items-center gap-1"
            >
              <span className="material-symbols-outlined !text-[16px]">add</span>
              Tambah "{q.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
