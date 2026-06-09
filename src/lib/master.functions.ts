import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Lists ----------

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
      .select("id_user, nip, username, nama, jabatan, status_kepegawaian, is_kepala_uptd")
      .order("nama");
    if (error) throw new Error(error.message);
    return data;
  });

export const listKepala = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("master_user")
      .select("id_user, nip, username, nama, jabatan")
      .eq("is_kepala_uptd", true)
      .order("nama");
    if (error) throw new Error(error.message);
    return data;
  });

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("master_user")
      .select(
        "id_user, nip, username, nama, email_internal, jabatan, unit, status_kepegawaian, role_user, is_kepala_uptd, id_golongan",
      )
      .order("nama");
    if (error) throw new Error(error.message);
    return data;
  });

// ---------- Generic name CRUD ----------

const namaField = z
  .string()
  .trim()
  .min(2, { message: "Nama minimal 2 karakter" })
  .max(300, { message: "Nama maksimal 300 karakter" });

const NamaSchema = z.object({ nama: namaField });
const NamaWithIdSchema = z.object({
  id: z.number().int().positive(),
  nama: namaField,
});
const IdSchema = z.object({ id: z.number().int().positive() });

function parseInput<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = result.error.issues.map((i) => i.message).join("; ");
    throw new Error(msg || "Input tidak valid");
  }
  return result.data;
}

// Rangka
export const addRangka = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => parseInput(NamaSchema, d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("master_rangka")
      .insert({ nama_rangka: data.nama })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateRangka = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => parseInput(NamaWithIdSchema, d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("master_rangka")
      .update({ nama_rangka: data.nama })
      .eq("id_rangka", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRangka = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => parseInput(IdSchema, d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("master_rangka")
      .delete()
      .eq("id_rangka", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Tempat
export const addTempat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => parseInput(NamaSchema, d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("master_tempat")
      .insert({ nama_tempat: data.nama })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateTempat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => parseInput(NamaWithIdSchema, d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("master_tempat")
      .update({ nama_tempat: data.nama })
      .eq("id_tempat", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTempat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => parseInput(IdSchema, d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("master_tempat")
      .delete()
      .eq("id_tempat", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Golongan
export const addGolongan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => parseInput(NamaSchema, d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("master_golongan")
      .insert({ nama_golongan: data.nama })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateGolongan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => parseInput(NamaWithIdSchema, d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("master_golongan")
      .update({ nama_golongan: data.nama })
      .eq("id_golongan", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGolongan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => parseInput(IdSchema, d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("master_golongan")
      .delete()
      .eq("id_golongan", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// updateUser dipindahkan ke `master-admin.functions.ts` karena memerlukan
// admin client untuk sinkronisasi auth.users.email saat status berubah.

