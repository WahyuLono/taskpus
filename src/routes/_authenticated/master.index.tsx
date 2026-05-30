import { createFileRoute, Link } from "@tanstack/react-router";
import { useRequireAdmin } from "@/hooks/use-require-admin";

export const Route = createFileRoute("/_authenticated/master/")({
  component: MasterIndex,
});

const ITEMS = [
  {
    to: "/master/golongan",
    title: "Golongan",
    desc: "Kelola tingkat golongan pegawai ASN",
    icon: "workspace_premium",
  },
  {
    to: "/master/rangka",
    title: "Rangka Kegiatan",
    desc: "Daftar jenis rangka kegiatan perjadin",
    icon: "category",
  },
  {
    to: "/master/tempat",
    title: "Tempat Tujuan",
    desc: "Daftar tempat tujuan perjadin",
    icon: "place",
  },
  {
    to: "/master/user",
    title: "User Pegawai",
    desc: "Kelola akun pegawai (Admin / Petugas)",
    icon: "group",
  },
  {
    to: "/master/nomor-surat",
    title: "Setting Nomor Surat",
    desc: "Atur jatah & range nomor surat per tahun",
    icon: "confirmation_number",
  },
];

function MasterIndex() {
  const { isAdmin, isLoading } = useRequireAdmin();
  if (isLoading || !isAdmin) return null;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-on-surface">Data Master</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Pusat kendali admin untuk seluruh data referensi aplikasi.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ITEMS.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            className="group rounded-xl border border-outline-variant bg-surface-container-lowest p-5 hover:border-primary hover:shadow-card transition"
          >
            <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <span className="material-symbols-outlined">{it.icon}</span>
            </div>
            <div className="font-semibold text-on-surface group-hover:text-primary">
              {it.title}
            </div>
            <div className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              {it.desc}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
