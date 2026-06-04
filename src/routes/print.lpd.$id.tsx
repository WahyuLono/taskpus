import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLpdDetail } from "@/lib/lpd.functions";
import { formatDate, formatNip } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/print/lpd/$id")({
  component: PrintSptPage,
});

function PrintSptPage() {
  const { id } = Route.useParams();
  const fetchDetail = useServerFn(getLpdDetail);
  const { data: me, isFetching: meLoading, ready, userId } = useCurrentUser();
  const isAdmin = me?.role_user === "Admin";
  const q = useQuery({
    queryKey: ["lpd-detail", id],
    queryFn: () => fetchDetail({ data: { id } }),
    enabled: isAdmin,
  });

  useEffect(() => {
    if (q.data && isAdmin) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [q.data, isAdmin]);

  if (!ready || (userId && !me) || meLoading)
    return <p className="p-10 text-center text-gray-500">Memuat…</p>;
  if (!isAdmin)
    return (
      <p className="p-10 text-center text-red-600">
        Akses ditolak — hanya Admin yang dapat mencetak Surat Tugas.
      </p>
    );
  if (q.isLoading)
    return <p className="p-10 text-center text-gray-500">Memuat surat…</p>;
  if (q.isError)
    return (
      <p className="p-10 text-center text-red-600">
        {(q.error as Error).message}
      </p>
    );
  if (!q.data) return null;

  const { lpd, petugas } = q.data as { lpd: any; petugas: any[] };


  const terbilang = (angka: number): string => {
    const huruf = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas", "dua belas", "tiga belas", "empat belas", "lima belas"];
    return angka < huruf.length ? huruf[angka] : angka.toString();
  };

  return (
    <>
      <style>{`
        @page { size: A4; margin: 1.4cm 2cm 1.4cm 2.5cm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .spt-page { max-width: none !important; margin: 0 !important; padding: 0 !important; }
          .spt-petugas-item { page-break-inside: avoid; break-inside: avoid; }
          .spt-signature-block { page-break-inside: avoid; break-inside: avoid; orphans: 4; widows: 4; }
          .spt-page ol li { page-break-inside: avoid; break-inside: avoid; }
        }
        .spt-page {
          font-family: Arial, sans-serif;
          font-size: 10pt;
          line-height: 1.25;
          color: #000;
          background: white;
          max-width: 21cm;
          margin: 0 auto;
          padding: 0;
        }
        @media screen { .spt-page { padding: 1cm 2cm; } }
        .spt-page h1 { font-size: 13pt; font-weight: bold; text-decoration: underline; text-align: center; margin: 0; }
        .spt-page table { border-collapse: collapse; }
        .spt-page td { vertical-align: top; padding: 1px 4px; }
        .spt-page ol { margin: 0; padding-left: 24px; list-style-position: outside; list-style-type: decimal !important; }
        .spt-page ol li { margin-bottom: 4px; }
      `}</style>

      <div className="no-print fixed top-3 right-3 flex gap-2 z-50">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold shadow"
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

      <div className="spt-page">
        {/* Kop Surat */}
        <header
          style={{
            borderBottom: "3px double #000",
            paddingBottom: 6,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* TODO: paste logo URL here */}
          <img
            src="/logo-1.jpg"
            alt="Logo Pemkab"
            style={{ width: 75, height: 75, objectFit: "contain", flexShrink: 0 }}
          />
          <div style={{ flex: 1, textAlign: "center" }}>
            <p style={{ margin: 0, fontWeight: "bold", fontSize: "13pt", whiteSpace: "nowrap" }}>
              PEMERINTAH KABUPATEN KOTAWARINGIN BARAT
            </p>
            <p style={{ margin: 0, fontWeight: "bold", fontSize: "13pt" }}>
              DINAS KESEHATAN
            </p>
            <p style={{ margin: 0, fontWeight: "bold", fontSize: "16pt" }}>
              UPTD PUSKESMAS KUMAI
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "10pt" }}>
              Jl. Pemuda RT 03, Kel. Kumai Hilir, Kec. Kumai 74181
            </p>
            <p style={{ margin: 0, fontSize: "10pt" }}>
              Telp. (0532) 61179, Pos-el: puskesmaskumai.2019@gmail.com
            </p>
          </div>
          {/* TODO: paste logo URL here */}
          <img
            src="/logo-2.jpg"
            alt="Logo Puskesmas"
            style={{ width: 75, height: 75, objectFit: "contain", flexShrink: 0 }}
          />
        </header>

        {/* Judul */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <h1>SURAT PERINTAH TUGAS</h1>
          <p style={{ margin: "2px 0 0" }}>Nomor : {lpd.no_surat}</p>
        </div>

        {/* Dasar */}
        <table style={{ width: "100%", marginBottom: 8 }}>
          <tbody>
            <tr>
              <td style={{ width: 80 }}>Dasar :</td>
              <td>
                <ol className="list-decimal">
                  <li>
                    Keputusan Menteri Dalam Negeri Nomor 13 Tahun 2006 tentang
                    Pedoman Pengelola Keuangan Daerah.
                  </li>
                  <li>
                    Peraturan Menteri Keuangan Nomor 113.PMK.05/2012 tentang
                    Perjalanan Dinas Dalam Negeri Bagi Pejabat Negara, Pegawai
                    Negeri dan Pegawai Tidak Tetap.
                  </li>
                  <li>
                    Peraturan Bupati Kotawaringin Barat Nomor 1 Tahun 2016
                    tentang Perjalanan Dinas Bagi Pejabat Negara, Pegawai
                    Negeri, dan Pegawai Tidak Tetap di Lingkungan Pemerintah
                    Kotawaringin Barat
                  </li>
                </ol>
              </td>
            </tr>
          </tbody>
        </table>

        <p style={{ textAlign: "center", margin: "10px 0" }}>MEMERINTAHKAN</p>

        {/* Kepada */}
        <table style={{ width: "100%", marginBottom: 8 }}>
          <tbody>
            <tr>
              <td style={{ width: 80 }}>Kepada :</td>
              <td>
                {petugas.length === 0 && <em>— belum ada petugas —</em>}
                {petugas.map((p, i) => (
                  <table
                    key={p.id_user}
                    className="spt-petugas-item"
                    style={{ width: "100%", marginBottom: 10 }}
                  >
                    <tbody>
                      <tr>
                        <td style={{ width: 20 }}>{i + 1}.</td>
                        <td style={{ width: 160 }}>Nama</td>
                        <td style={{ width: 10 }}>:</td>
                        <td>{p.nama}</td>
                      </tr>
                      <tr>
                        <td />
                        <td>NIP</td>
                        <td>:</td>
                        <td>{p.nip ? formatNip(p.nip) : "—"}</td>
                      </tr>
                      <tr>
                        <td />
                        <td>Pangkat / Golongan</td>
                        <td>:</td>
                        <td>{p.master_golongan?.nama_golongan ?? "—"}</td>
                      </tr>
                      <tr>
                        <td />
                        <td>Jabatan</td>
                        <td>:</td>
                        <td>{p.jabatan ?? "—"}</td>
                      </tr>
                      <tr>
                        <td />
                        <td>Unit</td>
                        <td>:</td>
                        <td>{p.unit ?? "—"}</td>
                      </tr>
                    </tbody>
                  </table>
                ))}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Untuk */}
        <table style={{ width: "100%", marginBottom: 8 }}>
          <tbody>
            <tr>
              <td style={{ width: 80 }}>Untuk :</td>
              <td>
                <p style={{ margin: "0 0 8px" }}>
                  Melaksanakan {lpd.jenis_perjadin}{" "}
                  <strong>{lpd.master_rangka?.nama_rangka ?? ""}</strong> di{" "}
                  {lpd.master_tempat?.nama_tempat ?? ""} Pada Tanggal :{" "}
                  {formatDate(lpd.tgl_kegiatan)}
                </p>
                <ol className="list-decimal">
                  <li>
                    Lamanya perjalanan dinas selama {lpd.lama_hari} ({terbilang(lpd.lama_hari)}) hari.
                  </li>
                  <li>
                    Melaporkan hasil pelaksanaan tugas kepada Kepala Puskesmas.
                  </li>
                  <li>Perintah ini dilaksanakan dengan penuh tanggung jawab.</li>
                  <li>
                    Apabila terdapat kekeliruan dalam Surat Perintah Tugas (SPT)
                    ini akan diadakan perbaikan sebagaimana mestinya.
                  </li>
                </ol>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Signature block (Dikeluarkan + TTD) — kept together on one page */}
        <div className="spt-signature-block">
          {/* Footer Date (Dikeluarkan) - Placed ABOVE the signatures */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <table style={{ width: 300, marginBottom: 8 }}>
              <tbody>
                <tr>
                  <td style={{ width: 110, whiteSpace: "nowrap" }}>Dikeluarkan</td>
                  <td>:</td>
                  <td>Kumai</td>
                </tr>
                <tr>
                  <td style={{ whiteSpace: "nowrap" }}>Pada Tanggal</td>
                  <td>:</td>
                  <td>{formatDate(lpd.tgl_buat)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer ttd — Split into Left (Mengetahui) and Right (Kepala UPTD) */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {/* COLUMN LEFT: Mengetahui */}
            <div style={{ width: 250, textAlign: "center" }}>
              <div>Mengetahui,</div>
              <div style={{ height: 80 }} />
              <div>( ............................................ )</div>
            </div>
            {/* COLUMN RIGHT: Kepala UPTD */}
            <div style={{ width: 300, textAlign: "center" }}>
              <div>Kepala UPTD Puskesmas Kumai</div>
              <div style={{ height: 80 }} />
              <div style={{ fontWeight: "bold", textDecoration: "underline" }}>
                {lpd.kepala?.nama ?? "—"}
              </div>
              <div>{lpd.kepala?.master_golongan?.nama_golongan ?? ""}</div>
              <div>
                NIP {lpd.kepala?.nip ? formatNip(lpd.kepala.nip) : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
