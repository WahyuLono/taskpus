import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CapacityMetric =
  | { status: "ok"; used: number; limit: number }
  | { status: "error"; limit: number; error: string };

export type CapacityResponse = {
  database: CapacityMetric;
  storage: CapacityMetric;
  egress: CapacityMetric;
  fetched_at: string;
};

const LIMITS = {
  database: 500 * 1024 * 1024, // 500 MB
  storage: 1024 * 1024 * 1024, // 1 GB
  egress: 5 * 1024 * 1024 * 1024, // 5 GB / bulan
};

async function fetchEgress(): Promise<CapacityMetric> {
  const token = process.env.SB_MANAGEMENT_PAT;
  const ref = process.env.SUPABASE_PROJECT_ID;
  if (!token) {
    return { status: "error", limit: LIMITS.egress, error: "Personal Access Token belum diatur (SB_MANAGEMENT_PAT)" };
  }
  if (!ref) {
    return { status: "error", limit: LIMITS.egress, error: "SUPABASE_PROJECT_ID tidak tersedia" };
  }

  try {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const end = now.toISOString();

    // Daily stats endpoint exposes egress for the requested window.
    const url = `https://api.supabase.com/v1/projects/${ref}/daily-stats?start_date=${encodeURIComponent(
      start,
    )}&end_date=${encodeURIComponent(end)}&attribute=total_egress_modified&interval=1d`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        status: "error",
        limit: LIMITS.egress,
        error: `Management API ${res.status}: ${body.slice(0, 120) || res.statusText}`,
      };
    }

    const json: any = await res.json();
    const points: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    let total = 0;
    for (const p of points) {
      const v = Number(p?.total_egress_modified ?? p?.value ?? p?.egress ?? 0);
      if (Number.isFinite(v)) total += v;
    }
    return { status: "ok", used: Math.round(total), limit: LIMITS.egress };
  } catch (e: any) {
    return { status: "error", limit: LIMITS.egress, error: e?.message ?? "Unknown error" };
  }
}

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

    const [dbRes, stRes, egRes] = await Promise.allSettled([
      supabaseAdmin.rpc("get_db_size" as any),
      supabaseAdmin.rpc("get_storage_size" as any),
      fetchEgress(),
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

    const egress: CapacityMetric =
      egRes.status === "fulfilled"
        ? egRes.value
        : { status: "error", limit: LIMITS.egress, error: egRes.reason?.message ?? "Unknown" };

    return { database, storage, egress, fetched_at: new Date().toISOString() };
  });
