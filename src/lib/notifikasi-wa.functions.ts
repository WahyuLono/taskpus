import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const NAMA_SETTING = "reminder_lpd";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("master_user")
    .select("role_user")
    .eq("id_user", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.role_user !== "Admin") {
    throw new Error("Forbidden: hanya Admin yang dapat melakukan aksi ini");
  }
}

export const getSettingNotifikasi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("setting_notifikasi")
      .select("id, nama_setting, template_pesan, updated_at")
      .eq("nama_setting", NAMA_SETTING)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Setting notifikasi belum tersedia");
    return data;
  });

export const updateSettingNotifikasi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        template_pesan: z
          .string()
          .trim()
          .min(10, { message: "Template pesan minimal 10 karakter" })
          .max(4000, { message: "Template pesan maksimal 4000 karakter" }),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("setting_notifikasi")
      .update({
        template_pesan: data.template_pesan,
        updated_at: new Date().toISOString(),
      })
      .eq("nama_setting", NAMA_SETTING);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

function normalizeWa(no: string): string | null {
  const digits = no.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits.length >= 9 ? digits : null;
}

function formatTanggal(iso: string): string {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export const sendReminderWa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id_lpd: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const token = process.env["FONNTE_TOKEN"];
    if (!token) throw new Error("FONNTE_TOKEN belum dikonfigurasi di server");

    const { data: lpd, error: lpdErr } = await context.supabase
      .from("transaksi_lpd")
      .select(
        `id_lpd, no_surat, tgl_kegiatan, status_lpd,
         detail_petugas(master_user:id_user_petugas(nama, username, nip, no_wa))`,
      )
      .eq("id_lpd", data.id_lpd)
      .maybeSingle();
    if (lpdErr) throw new Error(lpdErr.message);
    if (!lpd) throw new Error("LPD tidak ditemukan");

    const { data: setting, error: setErr } = await context.supabase
      .from("setting_notifikasi")
      .select("template_pesan")
      .eq("nama_setting", NAMA_SETTING)
      .maybeSingle();
    if (setErr) throw new Error(setErr.message);
    if (!setting) throw new Error("Template pesan belum tersedia");

    const petugas = ((lpd as any).detail_petugas ?? [])
      .map((d: any) => d.master_user)
      .filter(Boolean);

    const targets = petugas.filter((p: any) => normalizeWa(p.no_wa ?? ""));
    if (targets.length === 0) {
      throw new Error(
        "Tidak ada petugas dengan No. WhatsApp. Lengkapi di Master User terlebih dahulu.",
      );
    }

    const results: { nama: string; no_wa: string; ok: boolean; error?: string }[] = [];

    for (const p of targets) {
      const target = normalizeWa(p.no_wa)!;
      const pesan = setting.template_pesan
        .replaceAll("[nama_petugas]", p.nama ?? "-")
        .replaceAll("[no_surat]", (lpd as any).no_surat ?? "-")
        .replaceAll("[tgl_kegiatan]", formatTanggal((lpd as any).tgl_kegiatan))
        .replaceAll("[username]", p.username ?? p.nip ?? "-");

      try {
        const res = await fetch("https://api.fonnte.com/send", {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ target, message: pesan, countryCode: "62" }),
        });
        const bodyText = await res.text();
        let ok = res.ok;
        let errMsg: string | undefined;
        try {
          const parsed = JSON.parse(bodyText);
          if (parsed && parsed.status === false) {
            ok = false;
            errMsg = String(parsed.reason ?? parsed.detail ?? bodyText);
          }
        } catch {
          if (!res.ok) errMsg = bodyText;
        }
        if (!res.ok) errMsg = errMsg ?? `HTTP ${res.status}: ${bodyText}`;
        if (!ok) console.error(`[Fonnte] gagal ke ${target}: ${errMsg}`);
        results.push({ nama: p.nama, no_wa: target, ok, ...(errMsg ? { error: errMsg } : {}) });
      } catch (e: any) {
        console.error("[Fonnte] request error", e);
        results.push({ nama: p.nama, no_wa: target, ok: false, error: e?.message ?? "Gagal mengirim" });
      }
    }

    const sent = results.filter((r) => r.ok).length;
    return { sent, total: results.length, results };
  });
