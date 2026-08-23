import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import {
  getSettingNotifikasi,
  updateSettingNotifikasi,
} from "@/lib/notifikasi-wa.functions";

export const Route = createFileRoute("/_authenticated/master/setting-notifikasi")({
  component: Page,
});

const VARIABLES = [
  { key: "[nama_petugas]", desc: "Nama lengkap petugas" },
  { key: "[no_surat]", desc: "Nomor surat tugas / LPD" },
  { key: "[tgl_kegiatan]", desc: "Tanggal kegiatan (format Indonesia)" },
  { key: "[username]", desc: "Username / NIP untuk login" },
];

const SAMPLE: Record<string, string> = {
  "[nama_petugas]": "Budi Santoso",
  "[no_surat]": "090/1970/P.KI.2026",
  "[tgl_kegiatan]": "10 Agustus 2026",
  "[username]": "budi",
};

function Page() {
  const { isAdmin, isLoading } = useRequireAdmin();
  const qc = useQueryClient();
  const fnGet = useServerFn(getSettingNotifikasi);
  const fnUpdate = useServerFn(updateSettingNotifikasi);

  const setting = useQuery({
    queryKey: ["setting_notifikasi"],
    queryFn: () => fnGet(),
    enabled: isAdmin,
  });

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (setting.data?.template_pesan) setText(setting.data.template_pesan);
  }, [setting.data?.template_pesan]);

  if (isLoading || !isAdmin) return null;

  const rendered = Object.entries(SAMPLE).reduce(
    (acc, [k, v]) => acc.replaceAll(k, v),
    text,
  );

  const save = async () => {
    if (text.trim().length < 10) {
      toast.error("Template pesan minimal 10 karakter");
      return;
    }
    setBusy(true);
    try {
      await fnUpdate({ data: { template_pesan: text.trim() } });
      toast.success("Template pesan disimpan");
      qc.invalidateQueries({ queryKey: ["setting_notifikasi"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-on-surface">Setting Notifikasi</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Template pesan WhatsApp pengingat LPD yang dikirim ke petugas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 space-y-3">
          <Label>Template Pesan</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            maxLength={4000}
            className="font-mono text-sm min-h-[220px]"
            placeholder="Tulis template pesan pengingat…"
          />
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Button onClick={save} disabled={busy || setting.isLoading} className="w-full sm:w-auto">
              {busy ? "Menyimpan…" : "Simpan Template"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setPreview((p) => !p)}
              className="w-full sm:w-auto"
            >
              {preview ? "Sembunyikan Pratinjau" : "Pratinjau Contoh"}
            </Button>
            <span className="text-xs text-on-surface-variant sm:ml-auto">
              {text.length}/4000
            </span>
          </div>
          {preview && (
            <div className="rounded-lg border border-outline-variant bg-surface-container p-3 text-sm whitespace-pre-wrap break-words">
              {rendered || "—"}
            </div>
          )}
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
          <div className="font-semibold text-sm mb-2">Variabel yang tersedia</div>
          <ul className="space-y-2">
            {VARIABLES.map((v) => (
              <li key={v.key} className="text-xs">
                <button
                  type="button"
                  onClick={() => setText((t) => `${t}${v.key}`)}
                  className="font-mono text-primary hover:underline break-all"
                >
                  {v.key}
                </button>
                <div className="text-on-surface-variant">{v.desc}</div>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-on-surface-variant mt-3 leading-relaxed">
            Klik variabel untuk menyisipkannya ke akhir template.
          </p>
        </div>
      </div>
    </div>
  );
}
