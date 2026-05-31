import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { getLpdDetail, updateLpdSpt } from "@/lib/lpd.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { Section, Fld, Row, QuickSelect } from "./lpd.baru";

export const Route = createFileRoute("/_authenticated/lpd/$id_/edit")({
  component: EditSPTPage,
});

function EditSPTPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();

  const fetchDetail = useServerFn(getLpdDetail);
  const fetchRangka = useServerFn(listRangka);
  const fetchTempat = useServerFn(listTempat);
  const fetchKepala = useServerFn(listKepala);
  const fetchPetugas = useServerFn(listPetugas);
  const submitUpdate = useServerFn(updateLpdSpt);
  const submitRangka = useServerFn(addRangka);
  const submitTempat = useServerFn(addTempat);

  const detail = useQuery({
    queryKey: ["lpd-detail", id],
    queryFn: () => fetchDetail({ data: { id } }),
  });

  const enabled = !!me;
  const rangka = useQuery({ queryKey: ["rangka"], queryFn: () => fetchRangka(), enabled });
  const tempat = useQuery({ queryKey: ["tempat"], queryFn: () => fetchTempat(), enabled });
  const kepala = useQuery({ queryKey: ["kepala"], queryFn: () => fetchKepala(), enabled });
  const petugas = useQuery({ queryKey: ["petugas"], queryFn: () => fetchPetugas(), enabled });

  const [tglBuat, setTglBuat] = useState("");
  const [tglKegiatan, setTglKegiatan] = useState("");
  const [tglSelesai, setTglSelesai] = useState("");
  const [jenis, setJenis] = useState("Perjalanan Dinas Dalam Kota");
  const [idRangka, setIdRangka] = useState<number | "">("");
  const [idTempat, setIdTempat] = useState<number | "">("");
  const [idKepala, setIdKepala] = useState<string>("");
  const [petugasIds, setPetugasIds] = useState<string[]>([]);
  const [petugasSearch, setPetugasSearch] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  // Prefill once
  useEffect(() => {
    if (prefilled || !detail.data) return;
    const { lpd, petugas: assigned } = detail.data as any;
    setTglBuat((lpd.tgl_buat ?? "").slice(0, 10));
    setTglKegiatan((lpd.tgl_kegiatan ?? "").slice(0, 10));
    setTglSelesai((lpd.tgl_selesai ?? "").slice(0, 10));
    setJenis(lpd.jenis_perjadin ?? "Perjalanan Dinas Dalam Kota");
    setIdRangka(lpd.id_rangka ?? "");
    setIdTempat(lpd.id_tempat ?? "");
    setIdKepala(lpd.id_kepala ?? "");
    setPetugasIds((assigned ?? []).map((p: any) => p.id_user));
    setPrefilled(true);
  }, [detail.data, prefilled]);

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

  const lpd = (detail.data as any)?.lpd;
  const approval = lpd?.approval_status as string | undefined;
  const statusLpd = lpd?.status_lpd as string | undefined;
  const canEdit = statusLpd === "Belum" && approval === "Draft";

  const petugasAll = (petugas.data ?? []) as any[];
  const selectedPetugas = useMemo(
    () => petugasAll.filter((p) => petugasIds.includes(p.id_user)),
    [petugasAll, petugasIds],
  );
  const searchTrim = petugasSearch.trim().toLowerCase();
  const filteredPetugas = useMemo(
    () =>
      searchTrim
        ? petugasAll.filter(
            (p) =>
              !petugasIds.includes(p.id_user) &&
              `${p.nama} ${p.nip ?? ""} ${p.username ?? ""}`
                .toLowerCase()
                .includes(searchTrim),
          )
        : [],
    [petugasAll, petugasIds, searchTrim],
  );

  const submit = useMutation({
    mutationFn: () =>
      submitUpdate({
        data: {
          id,
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
    onSuccess: () => {
      toast.success("Perubahan SPT disimpan");
      qc.invalidateQueries({ queryKey: ["lpd-detail", id] });
      qc.invalidateQueries({ queryKey: ["lpd-list"] });
      navigate({ to: "/lpd/$id", params: { id } });
    },
    onError: (e: Error) => toast.error("Gagal menyimpan", { description: e.message }),
  });

  if (me && me.role_user !== "Admin") {
    return (
      <div className="bg-card border border-outline-variant rounded-xl p-8 text-center">
        <p className="font-semibold text-on-surface">Akses ditolak</p>
        <p className="text-sm text-on-surface-variant mt-1">
          Hanya Admin yang dapat mengubah Surat Perintah Tugas.
        </p>
      </div>
    );
  }

  if (detail.isLoading || !lpd) {
    return (
      <div className="flex items-center gap-2 text-on-surface-variant py-12 justify-center">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        Memuat data SPT…
      </div>
    );
  }

  if (!canEdit) {
    const reason =
      approval !== "Draft"
        ? `laporan sudah berstatus "${approval}"`
        : `status surat sudah "${statusLpd}"`;
    return (
      <div className="space-y-4">
        <Link to="/lpd/$id" params={{ id }} className="text-sm text-on-surface-variant hover:text-primary">
          ← Detail SPT
        </Link>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <p className="font-semibold text-amber-900">SPT tidak dapat diedit</p>
          <p className="text-sm text-amber-800 mt-1">
            Edit SPT hanya diperbolehkan saat <b>status surat = Belum</b> dan{" "}
            <b>approval = Draft</b>. Saat ini {reason}.
          </p>
        </div>
      </div>
    );
  }

  const lamaHari =
    tglKegiatan && tglSelesai
      ? Math.max(
          1,
          Math.round(
            (new Date(tglSelesai).getTime() - new Date(tglKegiatan).getTime()) / 86400000,
          ) + 1,
        )
      : 0;

  const valid =
    idRangka && idTempat && idKepala && petugasIds.length > 0 && jenis.trim().length >= 2;


  return (
    <form
      className="grid lg:grid-cols-3 gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate();
      }}
    >
      <div className="lg:col-span-2 space-y-5">
        <div className="bg-card border border-outline-variant rounded-xl p-5 shadow-card flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-on-surface-variant">
              Edit SPT
            </p>
            <h1 className="text-xl font-bold text-on-surface mt-1">{lpd.no_surat}</h1>
            <p className="text-xs text-on-surface-variant mt-1">
              Nomor surat tidak dapat diubah.
            </p>
          </div>
          <Link
            to="/lpd/$id"
            params={{ id }}
            className="text-sm text-on-surface-variant hover:text-primary"
          >
            ← Batal
          </Link>
        </div>

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
          <h3 className="font-semibold text-on-surface">Ringkasan Perubahan</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="No. Surat" v={lpd.no_surat} />
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
            {submit.isPending ? "Menyimpan…" : "Simpan Perubahan"}
          </Button>
          <Link
            to="/lpd/$id"
            params={{ id }}
            className="block text-center text-xs text-on-surface-variant mt-3 hover:text-primary"
          >
            Batalkan dan kembali
          </Link>
        </div>
      </aside>
    </form>
  );
}
