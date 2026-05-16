import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listGolongan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("master_golongan")
      .select("*")
      .order("nama_golongan");
    if (error) throw new Error(error.message);
    return data;
  });

export const listRangka = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("master_rangka")
      .select("*")
      .order("nama_rangka");
    if (error) throw new Error(error.message);
    return data;
  });

export const listTempat = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("master_tempat")
      .select("*")
      .order("nama_tempat");
    if (error) throw new Error(error.message);
    return data;
  });

export const listPetugas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("master_user")
      .select("id_user, nip, nama, jabatan, status_kepegawaian, is_kepala_uptd")
      .order("nama");
    if (error) throw new Error(error.message);
    return data;
  });

export const listKepala = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("master_user")
      .select("id_user, nip, nama, jabatan")
      .eq("is_kepala_uptd", true)
      .order("nama");
    if (error) throw new Error(error.message);
    return data;
  });

const NamaSchema = z.object({ nama: z.string().min(2).max(120) });

export const addRangka = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => NamaSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("master_rangka")
      .insert({ nama_rangka: data.nama })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const addTempat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => NamaSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("master_tempat")
      .insert({ nama_tempat: data.nama })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
