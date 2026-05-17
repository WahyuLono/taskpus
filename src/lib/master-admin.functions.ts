import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CreateUserSchema = z.object({
  nip: z.string().trim().regex(/^[0-9]{6,30}$/, "NIP harus 6-30 digit angka"),
  nama: z.string().trim().min(2).max(120),
  password: z.string().min(6).max(72),
  status_kepegawaian: z.enum(["ASN", "NON ASN"]),
  role_user: z.enum(["Admin", "Petugas"]),
  is_kepala_uptd: z.boolean(),
  id_golongan: z.number().int().positive().nullable(),
  jabatan: z.string().trim().max(120).nullable(),
  unit: z.string().trim().max(120).nullable(),
});

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

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CreateUserSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const email = `${data.nip}@lpd.internal`;

    // Check NIP unique in master_user
    const { data: existing } = await supabaseAdmin
      .from("master_user")
      .select("id_user")
      .eq("nip", data.nip)
      .maybeSingle();
    if (existing) throw new Error("NIP sudah terdaftar");

    const { data: created, error: authErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
      });
    if (authErr || !created.user) {
      throw new Error(authErr?.message ?? "Gagal membuat auth user");
    }

    const { error: insErr } = await supabaseAdmin.from("master_user").insert({
      id_user: created.user.id,
      nip: data.nip,
      nama: data.nama,
      email_internal: email,
      status_kepegawaian: data.status_kepegawaian,
      role_user: data.role_user,
      is_kepala_uptd: data.is_kepala_uptd,
      id_golongan: data.id_golongan,
      jabatan: data.jabatan,
      unit: data.unit,
    });
    if (insErr) {
      // Rollback auth user if profile insert failed
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(insErr.message);
    }
    return { ok: true, id_user: created.user.id };
  });

const ResetPasswordSchema = z.object({
  id_user: z.string().uuid(),
  password: z.string().min(6).max(72),
});

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ResetPasswordSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      data.id_user,
      { password: data.password },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id_user: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    if (data.id_user === context.userId) {
      throw new Error("Tidak dapat menghapus akun Anda sendiri");
    }

    // Block if user has assignments
    const { count: detailCount } = await supabaseAdmin
      .from("detail_petugas")
      .select("id_detail", { count: "exact", head: true })
      .eq("id_user_petugas", data.id_user);
    if ((detailCount ?? 0) > 0) {
      throw new Error(
        "User masih memiliki penugasan pada LPD. Hapus penugasan terlebih dahulu.",
      );
    }

    const { count: kepalaCount } = await supabaseAdmin
      .from("transaksi_lpd")
      .select("id_lpd", { count: "exact", head: true })
      .eq("id_kepala", data.id_user);
    if ((kepalaCount ?? 0) > 0) {
      throw new Error(
        "User masih tercatat sebagai Kepala UPTD pada LPD. Tidak dapat dihapus.",
      );
    }

    const { error: delProfile } = await supabaseAdmin
      .from("master_user")
      .delete()
      .eq("id_user", data.id_user);
    if (delProfile) throw new Error(delProfile.message);

    const { error: delAuth } = await supabaseAdmin.auth.admin.deleteUser(
      data.id_user,
    );
    if (delAuth) throw new Error(delAuth.message);

    return { ok: true };
  });
