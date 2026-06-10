import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CapacityMetric =
  | { status: "ok"; used: number; limit: number }
  | { status: "error"; limit: number; error: string };

export type CapacityResponse = {
  database: CapacityMetric;
  storage: CapacityMetric;
  fetched_at: string;
};

const LIMITS = {
  database: 500 * 1024 * 1024, // 500 MB
  storage: 1024 * 1024 * 1024, // 1 GB
};

export const getSupabaseCapacity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CapacityResponse> => {
    const { supabase, userId } = context;

    // Admin guard
    const { data: roleRow, error: roleErr } = await supabase
      .from("master_user")
      .select("role_user")
      .eq("id_user", userId)
      .maybeSingle();
    if (roleErr) throw new Error("Gagal verifikasi role: " + roleErr.message);
    if (roleRow?.role_user !== "Admin") throw new Error("Forbidden: hanya Admin");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [dbRes, stRes] = await Promise.allSettled([
      supabaseAdmin.rpc("get_db_size" as any),
      supabaseAdmin.rpc("get_storage_size" as any),
    ]);

    const database: CapacityMetric =
      dbRes.status === "fulfilled" && !dbRes.value.error
        ? { status: "ok", used: Number(dbRes.value.data ?? 0), limit: LIMITS.database }
        : {
            status: "error",
            limit: LIMITS.database,
            error:
              dbRes.status === "fulfilled"
                ? (dbRes.value.error?.message ?? "RPC error")
                : (dbRes.reason?.message ?? "Unknown"),
          };

    const storage: CapacityMetric =
      stRes.status === "fulfilled" && !stRes.value.error
        ? { status: "ok", used: Number(stRes.value.data ?? 0), limit: LIMITS.storage }
        : {
            status: "error",
            limit: LIMITS.storage,
            error:
              stRes.status === "fulfilled"
                ? (stRes.value.error?.message ?? "RPC error")
                : (stRes.reason?.message ?? "Unknown"),
          };

    return { database, storage, fetched_at: new Date().toISOString() };
  });
