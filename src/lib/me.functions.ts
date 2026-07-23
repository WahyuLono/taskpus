import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CurrentUser = {
  id_user: string;
  nip: string | null;
  username: string | null;
  nama: string;
  role_user: "Admin" | "Petugas";
  is_kepala_uptd: boolean;
  jabatan: string | null;
  unit: string | null;
  status_kepegawaian: "ASN" | "NON ASN";
};

export const getCurrentUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CurrentUser | null> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("master_user")
      .select(
        "id_user, nip, username, nama, role_user, is_kepala_uptd, jabatan, unit, status_kepegawaian",
      )
      .eq("id_user", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      id_user: data.id_user,
      nip: data.nip,
      username: data.username,
      nama: data.nama,
      role_user: (data.role_user ?? "Petugas") as "Admin" | "Petugas",
      is_kepala_uptd: !!data.is_kepala_uptd,
      jabatan: data.jabatan,
      unit: data.unit,
      status_kepegawaian: data.status_kepegawaian as "ASN" | "NON ASN",
    };
  });

// ---------- Self-service: ubah username sendiri ----------

const UsernameSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .refine((v) => !v.includes("@"), "Username tidak boleh mengandung '@'")
  .refine((v) => !/\s/.test(v), "Username tidak boleh mengandung spasi");

export const updateOwnUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ username: UsernameSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const newUsername = data.username;

    // Cek unik (case-insensitive)
    const { data: dupe } = await supabaseAdmin
      .from("master_user")
      .select("id_user")
      .ilike("username", newUsername)
      .maybeSingle();
    if (dupe && dupe.id_user !== userId) {
      throw new Error("Username sudah dipakai");
    }

    // Ambil row lama untuk tahu apakah NON ASN
    const { data: existing, error: loadErr } = await supabaseAdmin
      .from("master_user")
      .select("status_kepegawaian, nip")
      .eq("id_user", userId)
      .single();
    if (loadErr || !existing) throw new Error("Profil tidak ditemukan");

    const { error: updErr } = await supabaseAdmin
      .from("master_user")
      .update({ username: newUsername, updated_at: new Date().toISOString() })
      .eq("id_user", userId);
    if (updErr) throw new Error(updErr.message);

    const isNonAsn = existing.status_kepegawaian === "NON ASN";
    let mustReauth = false;

    if (isNonAsn) {
      // email_internal berubah → sinkron auth.users.email
      const { data: refreshed } = await supabaseAdmin
        .from("master_user")
        .select("email_internal")
        .eq("id_user", userId)
        .single();
      if (refreshed?.email_internal) {
        const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { email: refreshed.email_internal, email_confirm: true },
        );
        if (authErr) throw new Error(`Gagal sinkron email login: ${authErr.message}`);
        mustReauth = true;
      }
    }

    return { ok: true, mustReauth };
  });

