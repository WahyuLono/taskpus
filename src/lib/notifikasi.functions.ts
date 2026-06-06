import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listNotifikasi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        unreadOnly: z.boolean().default(false),
      })
      .default({ page: 1, pageSize: 20, unreadOnly: false })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = supabase
      .from("notifikasi")
      .select("id, id_lpd, tipe, judul, pesan, is_read, created_at, read_at", {
        count: "exact",
      })
      .eq("id_user", userId)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.unreadOnly) q = q.eq("is_read", false);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return {
      rows: rows ?? [],
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

export const countUnreadNotifikasi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { count, error } = await supabase
      .from("notifikasi")
      .select("id", { count: "exact", head: true })
      .eq("id_user", userId)
      .eq("is_read", false);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

export const markNotifikasiRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notifikasi")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("id_user", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotifikasiRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notifikasi")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id_user", userId)
      .eq("is_read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
