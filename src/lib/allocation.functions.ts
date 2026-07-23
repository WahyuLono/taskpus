import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export type Allocation = {
  id_allocation: number;
  tahun: number;
  range_start: number;
  range_end: number;
  last_used_number: number;
  status: "Active" | "Inactive";
  created_at: string;
  updated_at: string;
};

const ListSchema = z.object({ tahun: z.number().int().optional() }).optional();

export const listAllocations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = (supabaseAdmin as any)
      .from("nomor_surat_allocation")
      .select("*")
      .order("tahun", { ascending: false })
      .order("range_start", { ascending: true });
    if (data?.tahun) q = q.eq("tahun", data.tahun);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as Allocation[];
  });

const RangeBase = z.object({
  tahun: z.number().int().min(2000).max(2100),
  range_start: z.number().int().min(1).max(9999),
  range_end: z.number().int().min(1).max(9999),
});

const CreateSchema = RangeBase.refine((d) => d.range_end >= d.range_start, {
  message: "Range akhir harus ≥ range awal",
  path: ["range_end"],
});

export const createAllocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ok, error: vErr } = await (supabaseAdmin as any).rpc(
      "validate_allocation_range",
      {
        p_tahun: data.tahun,
        p_start: data.range_start,
        p_end: data.range_end,
        p_exclude_id: null,
      },
    );
    if (vErr) throw new Error(vErr.message);
    if (!ok)
      throw new Error("Range nomor bertabrakan dengan jatah yang sudah ada");

    const { error } = await (supabaseAdmin as any)
      .from("nomor_surat_allocation")
      .insert({
        tahun: data.tahun,
        range_start: data.range_start,
        range_end: data.range_end,
        last_used_number: data.range_start - 1,
        status: "Active",
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const UpdateSchema = RangeBase.extend({
  id_allocation: z.number().int().positive(),
  status: z.enum(["Active", "Inactive"]),
}).refine((d) => d.range_end >= d.range_start, {
  message: "Range akhir harus ≥ range awal",
  path: ["range_end"],
});

export const updateAllocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cur, error: loadErr } = await (supabaseAdmin as any)
      .from("nomor_surat_allocation")
      .select("last_used_number")
      .eq("id_allocation", data.id_allocation)
      .maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!cur) throw new Error("Jatah tidak ditemukan");

    const used = cur.last_used_number as number;
    if (used > data.range_end)
      throw new Error(
        `Range akhir tidak boleh < nomor terakhir terpakai (${used})`,
      );
    if (used >= data.range_start && used < data.range_start)
      throw new Error("Range awal tidak valid");
    if (used > 0 && used < data.range_start - 1)
      throw new Error(
        `Range awal tidak boleh > nomor terakhir terpakai + 1 (${used + 1})`,
      );

    const { data: ok, error: vErr } = await (supabaseAdmin as any).rpc(
      "validate_allocation_range",
      {
        p_tahun: data.tahun,
        p_start: data.range_start,
        p_end: data.range_end,
        p_exclude_id: data.id_allocation,
      },
    );
    if (vErr) throw new Error(vErr.message);
    if (!ok)
      throw new Error("Range nomor bertabrakan dengan jatah yang sudah ada");

    const { error } = await (supabaseAdmin as any)
      .from("nomor_surat_allocation")
      .update({
        tahun: data.tahun,
        range_start: data.range_start,
        range_end: data.range_end,
        status: data.status,
      })
      .eq("id_allocation", data.id_allocation);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAllocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id_allocation: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cur, error: loadErr } = await (supabaseAdmin as any)
      .from("nomor_surat_allocation")
      .select("last_used_number, range_start")
      .eq("id_allocation", data.id_allocation)
      .maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!cur) throw new Error("Jatah tidak ditemukan");
    if ((cur.last_used_number as number) >= (cur.range_start as number))
      throw new Error("Jatah sudah dipakai dan tidak dapat dihapus");

    const { error } = await (supabaseAdmin as any)
      .from("nomor_surat_allocation")
      .delete()
      .eq("id_allocation", data.id_allocation);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
