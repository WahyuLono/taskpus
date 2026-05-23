import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLpdDetail } from "@/lib/lpd.functions";
import { formatDate, formatNip } from "@/lib/format";

export const Route = createFileRoute("/print/lpd/$id")({
  component: PrintSptPage,
});

function PrintSptPage() {
  const { id } = Route.useParams();
  const fetchDetail = useServerFn(getLpdDetail);
  const q = useQuery({
    queryKey: ["lpd-detail", id],
    queryFn: () => fetchDetail({ data: { id } }),
  });

  useEffect(() => {
    if (q.data) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [q.data]);

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

  return (
    <>
      <style>{`
        @page { size: A4; margin: 2cm 2cm 2cm 2.5cm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        .spt-page {
          font-family: "Times New Roman", Times, serif;
          font-size: 12pt;
          line-height: 1.4;
          color: #000;
          background: white;
          max-width: 21cm;
          margin: 0 auto;
          padding: 1cm 2cm;
        }
        .spt-page h1 { font-size: 13pt; font-weight: bold; text-decoration: underline; text-align: center; margin: 0; }
        .spt-page table { border-collapse: collapse; }
        .spt-page td { vertical-align: top; padding: 2px 4px; }
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
            textAlign: "center",
            borderBottom: "3px double #000",
            paddingBottom: 6,
            marginBottom: 18,
          }}
        >
          <p style={{ margin: 0, fontWeight: "bold", fontSize: "14pt" }}>
            PEMERINTAH KABUPATEN KOTAWARINGIN BARAT
          </p>
          <p style={{ margin: 0, fontWeight: "bold", fontSize: "13pt" }}>
            DINAS KESEHATAN
          </p>
          <p style={{ margin: 0, fontWeight: "bold", fontSize: "16pt" }}>
            PUSKESMAS KUMAI
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "10pt" }}>
            Jl. Pemuda RT 03, Kel. Kumai Hilir, Kec. Kumai 74181
          </p>
          <p style={{ margin: 0, fontSize: "10pt" }}>
            Telp. (0532) 61179, Pos-el: puskesmaskumai.2019@gmail.com
          </p>
        </header>

        {/* Judul */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <h1>SURAT PERINTAH TUGAS</h1>
          <p style={{ margin: "2px 0 0", textDecoration: "underline" }}>
            Nomor : {lpd.no_surat}
          </p>
        </div>

        {/* Dasar */}
        <table style={{ width: "100%", marginBottom: 12 }}>
          <tbody>
            <tr>
              <td style={{ width: 80, textDecoration: "underline" }}>Dasar :</td>
              <td>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
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

        <p style={{ textAlign: "center", margin: "16px 0" }}>MEMERINTAHKAN</p>

        {/* Kepada */}
        <table style={{ width: "100%", marginBottom: 12 }}>
          <tbody>
            <tr>
              <td style={{ width: 80, textDecoration: "underline" }}>
                Kepada :
              </td>
              <td>
                {petugas.length === 0 && <em>— belum ada petugas —</em>}
                {petugas.map((p, i) => (
                  <table
                    key={p.id_user}
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
                        <td style={{ textDecoration: "underline" }}>
                          Pangkat / Golongan
                        </td>
                        <td>:</td>
                        <td>{p.master_golongan?.nama_golongan ?? "—"}</td>
                      </tr>
                      <tr>
                        <td />
                        <td style={{ textDecoration: "underline" }}>Jabatan</td>
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
        <table style={{ width: "100%", marginBottom: 12 }}>
          <tbody>
            <tr>
              <td style={{ width: 80, textDecoration: "underline" }}>
                Untuk :
              </td>
              <td>
                <p style={{ margin: "0 0 8px" }}>
                  Melaksanakan {lpd.jenis_perjadin}{" "}
                  {lpd.master_rangka?.nama_rangka ?? ""} di{" "}
                  {lpd.master_tempat?.nama_tempat ?? ""} Pada Tanggal :{" "}
                  {formatDate(lpd.tgl_kegiatan)}
                </p>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  <li>
                    Lamanya perjalanan dinas selama ({lpd.lama_hari}) (dalam
                    bilangan lama hari) hari.
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

        {/* Footer ttd */}
        <table style={{ width: "100%", marginTop: 30 }}>
          <tbody>
            <tr>
              <td style={{ width: "50%" }} />
              <td>
                <table>
                  <tbody>
                    <tr>
                      <td style={{ width: 110, textDecoration: "underline" }}>
                        Dikeluarkan
                      </td>
                      <td>:</td>
                      <td>Kumai</td>
                    </tr>
                    <tr>
                      <td>Pada Tanggal</td>
                      <td>:</td>
                      <td>{formatDate(lpd.tgl_buat)}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style={{ paddingTop: 12 }}>Mengetahui,</td>
              <td style={{ paddingTop: 12 }}>
                Kepala UPTD Puskesmas Kumai
              </td>
            </tr>
            <tr>
              <td style={{ paddingTop: 70, textAlign: "center" }}>
                (……………………………)
              </td>
              <td style={{ paddingTop: 70, textAlign: "center" }}>
                <div style={{ fontWeight: "bold", textDecoration: "underline" }}>
                  {lpd.kepala?.nama ?? "—"}
                </div>
                <div>{lpd.kepala?.master_golongan?.nama_golongan ?? ""}</div>
                <div>NIP {lpd.kepala?.nip ? formatNip(lpd.kepala.nip) : "—"}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
