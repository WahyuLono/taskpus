import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const wipeLaporanBucket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "Admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bucket = supabaseAdmin.storage.from("laporan_lpd");

    let deleted = 0;
    async function walk(prefix: string) {
      const { data, error } = await bucket.list(prefix, {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error(error.message);
      if (!data) return;
      const files: string[] = [];
      for (const item of data) {
        const full = prefix ? `${prefix}/${item.name}` : item.name;
        if ((item as any).id === null || (item as any).metadata === null) {
          await walk(full);
        } else {
          files.push(full);
        }
      }
      if (files.length) {
        const { error: rmErr } = await bucket.remove(files);
        if (rmErr) throw new Error(rmErr.message);
        deleted += files.length;
      }
    }
    await walk("");
    return { deleted };
  });
