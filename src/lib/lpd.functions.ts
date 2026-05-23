import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [all, belum, sudah, batal] = await Promise.all([
      supabase.from("transaksi_lpd").select("id_lpd", { count: "exact", head: true }),
      supabase
        .from("transaksi_lpd")
        .select("id_lpd", { count: "exact", head: true })
        .eq("status_lpd", "Belum"),
      supabase
        .from("transaksi_lpd")
        .select("id_lpd", { count: "exact", head: true })
        .eq("status_lpd", "Sudah"),
      supabase
        .from("transaksi_lpd")
        .select("id_lpd", { count: "exact", head: true })
        .eq("status_lpd", "Batal"),
    ]);
    return {
      total: all.count ?? 0,
      belum: belum.count ?? 0,
      sudah: sudah.count ?? 0,
      batal: batal.count ?? 0,
    };
  });

const ListLpdSchema = z
  .object({
    status: z.enum(["Belum", "Sudah", "Batal"]).optional(),
    search: z.string().optional(),
    limit: z.number().min(1).max(200).default(50),
  })
  .default({ limit: 50 });

export const listLpd = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListLpdSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("transaksi_lpd")
      .select(
        `id_lpd, no_surat, no_surat_slug, jenis_perjadin, tgl_kegiatan, tgl_selesai, lama_hari, status_lpd, created_at,
         master_rangka:id_rangka(nama_rangka),
         master_tempat:id_tempat(nama_tempat),
         kepala:id_kepala(nama, jabatan)`,
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status_lpd", data.status);
    if (data.search) q = q.ilike("no_surat", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows;
  });

export const getLpdDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: lpd, error } = await supabase
      .from("transaksi_lpd")
      .select(
        `*,
         master_rangka:id_rangka(nama_rangka),
         master_tempat:id_tempat(nama_tempat),
         kepala:id_kepala(id_user, nama, nip, jabatan, unit, status_kepegawaian, master_golongan:id_golongan(nama_golongan))`,
      )
      .eq("id_lpd", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lpd) throw new Error("LPD tidak ditemukan");

    const { data: petugas, error: petugasErr } = await supabase
      .from("detail_petugas")
      .select(
        `id_detail,
         master_user:id_user_petugas(
           id_user, nip, nama, jabatan, unit, status_kepegawaian,
           master_golongan:id_golongan(nama_golongan)
         )`,
      )
      .eq("id_lpd", data.id)
      .order("id_detail", { ascending: true });
    if (petugasErr) throw new Error(petugasErr.message);

    return {
      lpd,
      petugas: (petugas ?? []).map((r: any) => r.master_user).filter(Boolean),
    };
  });

const SubmitLaporanSchema = z.object({
  id: z.string().uuid(),
  hasil_kegiatan: z.string().min(150).max(10000),
  url_foto: z.string().min(1).max(500),
});

export const submitLaporan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SubmitLaporanSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: lpd, error: fetchErr } = await supabase
      .from("transaksi_lpd")
      .select("id_lpd, status_lpd")
      .eq("id_lpd", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!lpd) throw new Error("LPD tidak ditemukan");
    if (lpd.status_lpd !== "Belum")
      throw new Error("Laporan sudah dikirim atau LPD dibatalkan");

    const { error: updErr } = await supabase
      .from("transaksi_lpd")
      .update({
        status_lpd: "Sudah",
        hasil_kegiatan: data.hasil_kegiatan,
        url_foto: data.url_foto,
        updated_at: new Date().toISOString(),
      })
      .eq("id_lpd", data.id);
    if (updErr) throw new Error(updErr.message);
    return { ok: true };
  });

export const listMyTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: details, error } = await supabase
      .from("detail_petugas")
      .select(
        `id_lpd,
         transaksi_lpd:id_lpd(
           id_lpd, no_surat, no_surat_slug, jenis_perjadin, tgl_kegiatan, tgl_selesai,
           lama_hari, status_lpd, url_foto, hasil_kegiatan,
           master_rangka:id_rangka(nama_rangka),
           master_tempat:id_tempat(nama_tempat)
         )`,
      )
      .eq("id_user_petugas", userId);
    if (error) throw new Error(error.message);
    return (details ?? [])
      .map((d) => d.transaksi_lpd)
      .filter((x): x is NonNullable<typeof x> => !!x && !(x as any).deleted_at);
  });

const CreateLpdSchema = z.object({
  tgl_buat: z.string(),
  tgl_kegiatan: z.string(),
  tgl_selesai: z.string(),
  jenis_perjadin: z.string().min(2),
  id_rangka: z.number().int().positive(),
  id_tempat: z.number().int().positive(),
  id_kepala: z.string().uuid(),
  petugas_ids: z.array(z.string().uuid()).min(1).max(20),
});

export const createLpd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateLpdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("create_lpd_baru", {
      p_tgl_buat: data.tgl_buat,
      p_tgl_kegiatan: data.tgl_kegiatan,
      p_tgl_selesai: data.tgl_selesai,
      p_jenis_perjadin: data.jenis_perjadin,
      p_id_rangka: data.id_rangka,
      p_id_tempat: data.id_tempat,
      p_id_kepala: data.id_kepala,
      p_petugas_ids: data.petugas_ids,
    });
    if (error) throw new Error(error.message);
    return result as {
      status: string;
      id_lpd: string;
      no_surat: string;
      lama_hari: number;
      upload_path: string;
    };
  });

const UpdateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["Belum", "Sudah", "Batal"]),
  hasil_kegiatan: z.string().optional(),
});

export const updateLpdStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateStatusSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("transaksi_lpd")
      .update({
        status_lpd: data.status,
        updated_at: new Date().toISOString(),
        ...(data.hasil_kegiatan !== undefined ? { hasil_kegiatan: data.hasil_kegiatan } : {}),
        ...(data.status === "Batal" ? { deleted_at: new Date().toISOString() } : {}),
      })
      .eq("id_lpd", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
