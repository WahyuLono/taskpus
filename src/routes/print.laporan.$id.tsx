import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLpdDetail } from "@/lib/lpd.functions";
import { formatDate, formatDateRangeFull, formatNip } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/print/laporan/$id")({
  component: PrintLaporanPage,
});

function PrintLaporanPage() {
  const { id } = Route.useParams();
  const fetchDetail = useServerFn(getLpdDetail);
  const { data: me, isFetching: meLoading, ready, userId } = useCurrentUser();

  const q = useQuery({
    queryKey: ["lpd-detail", id],
    queryFn: () => fetchDetail({ data: { id } }),
    enabled: !!me,
  });

  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const urlFoto = (q.data as any)?.lpd?.url_foto as string | undefined;

  useEffect(() => {
    if (!urlFoto) return;
    let cancel = false;
    supabase.storage
      .from("laporan_lpd")
      .createSignedUrl(urlFoto, 3600)
      .then(({ data }) => {
        if (!cancel) setFotoUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancel = true;
    };
  }, [urlFoto]);

  // Auto-print once data + image are ready
  useEffect(() => {
    if (!q.data) return;
    if (urlFoto && !fotoUrl) return; // wait for signed URL
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [q.data, urlFoto, fotoUrl]);

  if (!ready || (userId && !me) || meLoading)
    return <p className="p-10 text-center text-gray-500">Memuat…</p>;
  if (q.isLoading)
    return <p className="p-10 text-center text-gray-500">Memuat laporan…</p>;
  if (q.isError)
    return (
      <p className="p-10 text-center text-red-600">
        {(q.error as Error).message}
      </p>
    );
  if (!q.data) return null;

  const { lpd, petugas } = q.data as { lpd: any; petugas: any[] };
  const isAdmin = me?.role_user === "Admin";
  const isPetugasOfThisLpd =
    !!me && petugas.some((p) => p.id_user === me.id_user);

  if (isAdmin || !isPetugasOfThisLpd) {
    return (
      <p className="p-10 text-center text-red-600">
        Akses ditolak — Cetak LPD hanya tersedia untuk petugas yang ditugaskan.
      </p>
    );
  }
  if (lpd.approval_status !== "Disetujui") {
    return (
      <p className="p-10 text-center text-red-600">
        Laporan belum disetujui Admin. Tombol cetak hanya aktif setelah laporan
        disetujui.
      </p>
    );
  }

  return (
    <>
      <style>{`
        @page { size: A4; margin: 1.4cm 1.8cm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        .lpd-page {
          font-family: Arial, sans-serif;
          font-size: 10pt;
          line-height: 1.3;
          color: #000;
          background: white;
          max-width: 21cm;
          margin: 0 auto;
          padding: 1cm 1.8cm;
        }
        .lpd-page h1 {
          font-size: 14pt;
          font-weight: bold;
          text-decoration: underline;
          text-align: center;
          margin: 0 0 14px;
        }
        .lpd-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 18px;
        }
        .lpd-table th, .lpd-table td {
          border: 1px solid #000;
          padding: 6px 8px;
          vertical-align: top;
          text-align: left;
        }
        .lpd-table td.num {
          width: 28px;
          text-align: center;
          font-weight: bold;
        }
        .lpd-table td.label {
          width: 160px;
          font-weight: bold;
        }
        .lpd-sub {
          margin: 0;
          padding: 0;
        }
        .lpd-sub li {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .lpd-group {
          font-weight: bold;
          margin-top: 4px;
        }
        .lpd-row {
          display: grid;
          grid-template-columns: 22px 170px 10px 1fr;
          column-gap: 4px;
          padding-left: 18px;
        }
        .lpd-foto {
          max-width: 100%;
          max-height: 9cm;
          object-fit: contain;
        }
        .ttd-block {
          margin-bottom: 26px;
        }
        .ttd-row {
          display: grid;
          grid-template-columns: 24px 60px 12px 1fr;
          column-gap: 4px;
        }
        .ttd-line {
          text-align: right;
          margin-top: 56px;
        }
      `}</style>

      <div className="no-print fixed top-3 right-3 flex gap-2 z-50">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold shadow"
        >
          🖨 Cetak
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 text-sm font-semibold shadow"
        >
          Tutup
        </button>
      </div>

      <div className="lpd-page">
        <h1>LAPORAN PERJALANAN DINAS</h1>

        <table className="lpd-table">
          <tbody>
            <tr>
              <td className="num">1.</td>
              <td className="label">Maksud dan Tujuan</td>
              <td>{lpd.master_rangka?.nama_rangka ?? "—"}</td>
            </tr>
            <tr>
              <td className="num">2.</td>
              <td className="label">Tempat Tujuan</td>
              <td>{lpd.master_tempat?.nama_tempat ?? "—"}</td>
            </tr>
            <tr>
              <td className="num">3.</td>
              <td className="label">Tanggal Pelaksanaan</td>
              <td>{formatDateRange(lpd.tgl_kegiatan, lpd.tgl_selesai)}</td>
            </tr>
            <tr>
              <td className="num">4.</td>
              <td className="label">Hasil Kegiatan</td>
              <td>
                <div className="lpd-group">A. INPUT</div>
                <DetailRow no="1" label="Pelaksana Kegiatan" value={`${petugas.length} orang`} />
                <DetailRow no="2" label="Sumber Dana" value="BOK" />
                <DetailRow no="3" label="Alat yang Digunakan" value={lpd.input_alat ?? "—"} />
                <DetailRow no="4" label="Metode" value={lpd.input_metode ?? "—"} />
                <DetailRow no="5" label="Lama Kegiatan" value={lpd.input_lama_kegiatan ?? "—"} />

                <div className="lpd-group">B. PROSES</div>
                <DetailRow no="1" label="Sasaran" value={lpd.proses_sasaran ?? "—"} />
                <DetailRow no="2" label="Jadwal" value={formatDate(lpd.tgl_kegiatan)} />
                <DetailRow no="3" label="Tempat Pelaksanaan" value={lpd.master_tempat?.nama_tempat ?? "—"} />
                <DetailRow no="4" label="Hambatan" value={lpd.proses_hambatan ?? "—"} />

                <div className="lpd-group">C. OUTPUT</div>
                <DetailRow no="" label="" value={lpd.output ?? "—"} />

                <div className="lpd-group">D. TINDAK LANJUT</div>
                <DetailRow no="" label="" value={lpd.tindak_lanjut ?? "—"} />
              </td>
            </tr>
            <tr>
              <td className="num">5.</td>
              <td className="label">Dokumentasi</td>
              <td>
                {fotoUrl ? (
                  <img src={fotoUrl} alt="Dokumentasi" className="lpd-foto" />
                ) : urlFoto ? (
                  <span style={{ color: "#666" }}>Memuat foto…</span>
                ) : (
                  <span style={{ color: "#666" }}>—</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontWeight: "bold", marginBottom: 14 }}>
          Yang Melaksanakan Perjalanan Dinas:
        </p>

        {petugas.map((p, i) => (
          <div key={p.id_user} className="ttd-block">
            <div className="ttd-row">
              <div>{i + 1}.</div>
              <div>Nama</div>
              <div>:</div>
              <div>{p.nama ?? "—"}</div>
            </div>
            <div className="ttd-row">
              <div />
              <div>NIP</div>
              <div>:</div>
              <div>{p.nip ? formatNip(p.nip) : "—"}</div>
            </div>
            <div className="ttd-line">(……………………………………)</div>
          </div>
        ))}
      </div>
    </>
  );
}

function DetailRow({
  no,
  label,
  value,
}: {
  no: string;
  label: string;
  value: string;
}) {
  return (
    <div className="lpd-row">
      <div>{no ? `${no}.` : ""}</div>
      <div>{label}</div>
      <div>{label ? ":" : ""}</div>
      <div style={{ whiteSpace: "pre-line" }}>{value}</div>
    </div>
  );
}
