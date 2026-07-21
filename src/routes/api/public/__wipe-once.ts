import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/__wipe-once")({
  server: {
    handlers: {
      POST: async () => {
        {
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const bucket = supabaseAdmin.storage.from("laporan_lpd");
        let deleted = 0;
        async function walk(prefix: string): Promise<void> {
          const { data, error } = await bucket.list(prefix, { limit: 1000 });
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
        try {
          await walk("");
          return Response.json({ deleted });
        } catch (e: any) {
          return new Response(e.message, { status: 500 });
        }
      },
    },
  },
});
