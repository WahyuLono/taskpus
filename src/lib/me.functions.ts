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
