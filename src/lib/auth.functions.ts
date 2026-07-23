import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ResolveSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[^@\s]+$/, "Identifier tidak valid"),
});

// Public (no auth middleware): resolves login email from NIP or username.
// Returns the email_internal to use with signInWithPassword, or null when
// no matching user exists (caller should still attempt sign-in to keep the
// error message uniform — avoid user enumeration).
export const resolveLoginEmail = createServerFn({ method: "POST" })
  .inputValidator((d) => ResolveSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const raw = data.identifier;
    const isNumeric = /^[0-9]+$/.test(raw);

    let query = supabaseAdmin
      .from("master_user")
      .select("email_internal")
      .limit(1);

    if (isNumeric) {
      query = query.eq("nip", raw);
    } else {
      query = query.ilike("username", raw);
    }

    const { data: row } = await query.maybeSingle();
    return { email: row?.email_internal ?? null };
  });
