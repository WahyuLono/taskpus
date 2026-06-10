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

  const headers = { Authorization: `Bearer ${token}` };

  try {
    // Step 1: get organization_id from project
    const projRes = await fetch(`https://api.supabase.com/v1/projects/${ref}`, { headers });
    if (!projRes.ok) {
      const body = await projRes.text().catch(() => "");
      return {
        status: "error",
        limit: LIMITS.egress,
        error: `Management API ${projRes.status} (project): ${body.slice(0, 120) || projRes.statusText}`,
      };
    }
    const proj: any = await projRes.json();
    const orgSlug: string | undefined = proj?.organization_id ?? proj?.organization?.slug;
    if (!orgSlug) {
      return { status: "error", limit: LIMITS.egress, error: "organization_id tidak ditemukan di response project" };
    }

    // Step 2: get org usage
    const usageRes = await fetch(
      `https://api.supabase.com/v1/organizations/${orgSlug}/usage?project_ref=${ref}`,
      { headers },
    );
    if (!usageRes.ok) {
      const body = await usageRes.text().catch(() => "");
      return {
        status: "error",
        limit: LIMITS.egress,
        error: `Management API ${usageRes.status} (usage): ${body.slice(0, 120) || usageRes.statusText}`,
      };
    }
    const usage: any = await usageRes.json();
    const items: any[] = Array.isArray(usage?.usages)
      ? usage.usages
      : Array.isArray(usage?.data)
        ? usage.data
        : Array.isArray(usage)
          ? usage
          : [];

    let total = 0;
    let limitFromApi = 0;
    for (const it of items) {
      const key = String(it?.metric ?? it?.name ?? it?.key ?? "").toLowerCase();
      if (!key.includes("egress")) continue;
      const used = Number(it?.usage ?? it?.value ?? it?.used ?? 0);
      if (Number.isFinite(used)) total += used;
      const lim = Number(it?.pricing_free_units ?? it?.free_units ?? 0);
      if (Number.isFinite(lim)) limitFromApi += lim;
    }

    if (items.length === 0) {
      return { status: "error", limit: LIMITS.egress, error: "Response usage kosong / format tidak dikenal" };
    }

    return {
      status: "ok",
      used: Math.round(total),
      limit: limitFromApi > 0 ? limitFromApi : LIMITS.egress,
    };
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
