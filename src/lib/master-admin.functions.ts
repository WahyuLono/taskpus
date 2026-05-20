import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const UsernameSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .refine((v) => !v.includes("@"), "Username tidak boleh mengandung '@'")
  .refine((v) => !/\s/.test(v), "Username tidak boleh mengandung spasi");

const NipSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{6,30}$/, "NIP harus 6-30 digit angka");

const CreateUserSchema = z
  .object({
    nip: z.union([NipSchema, z.literal("")]).optional().nullable(),
    username: z.union([UsernameSchema, z.literal("")]).optional().nullable(),
    nama: z.string().trim().min(2).max(120),
    password: z.string().min(6).max(72),
    status_kepegawaian: z.enum(["ASN", "NON ASN"]),
    role_user: z.enum(["Admin", "Petugas"]),
    is_kepala_uptd: z.boolean(),
    id_golongan: z.number().int().positive().nullable(),
    jabatan: z.string().trim().max(120).nullable(),
    unit: z.string().trim().max(120).nullable(),
  })
  .transform((d) => ({
    ...d,
    nip: d.nip ? d.nip : null,
    username: d.username ? d.username : null,
  }))
  .superRefine((d, ctx) => {
    if (d.status_kepegawaian === "ASN") {
      if (!d.nip) {
        ctx.addIssue({
          code: "custom",
          path: ["nip"],
          message: "NIP wajib untuk ASN",
        });
      }
    } else {
      if (d.nip) {
        ctx.addIssue({
          code: "custom",
          path: ["nip"],
          message: "NON ASN tidak boleh memiliki NIP",
        });
      }
      if (!d.username) {
        ctx.addIssue({
          code: "custom",
          path: ["username"],
          message: "Username wajib untuk NON ASN",
        });
      }
      if (d.id_golongan != null) {
        ctx.addIssue({
          code: "custom",
          path: ["id_golongan"],
          message: "NON ASN tidak memiliki golongan",
        });
      }
    }
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

    const identifier = data.nip ?? data.username!.toLowerCase();
    const email = `${identifier}@lpd.internal`;

    // Uniqueness checks
    if (data.nip) {
      const { data: existsNip } = await supabaseAdmin
        .from("master_user")
        .select("id_user")
        .eq("nip", data.nip)
        .maybeSingle();
      if (existsNip) throw new Error("NIP sudah terdaftar");
    }
    if (data.username) {
      const { data: existsUser } = await supabaseAdmin
        .from("master_user")
        .select("id_user")
        .ilike("username", data.username)
        .maybeSingle();
      if (existsUser) throw new Error("Username sudah terdaftar");
    }

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
      username: data.username,
      nama: data.nama,
      status_kepegawaian: data.status_kepegawaian,
      role_user: data.role_user,
      is_kepala_uptd: data.is_kepala_uptd,
      id_golongan: data.id_golongan,
      jabatan: data.jabatan,
      unit: data.unit,
    });
    if (insErr) {
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

// ---------- Update User (with NON ASN → ASN transition + auth email sync) ----------

const UpdateUserSchema = z.object({
  id_user: z.string().uuid(),
  nama: z.string().trim().min(2).max(120),
  // status optional pada payload; jika dikirim & berubah, hanya boleh NON ASN → ASN
  status_kepegawaian: z.enum(["ASN", "NON ASN"]).optional(),
  // nip wajib hanya saat transisi → ASN
  nip: z.union([NipSchema, z.literal("")]).optional().nullable(),
  role_user: z.enum(["Admin", "Petugas"]),
  is_kepala_uptd: z.boolean(),
  id_golongan: z.number().int().positive().nullable(),
  jabatan: z.string().trim().max(120).nullable(),
  unit: z.string().trim().max(120).nullable(),
});

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpdateUserSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    // Ambil row lama
    const { data: existing, error: loadErr } = await supabaseAdmin
      .from("master_user")
      .select("status_kepegawaian, nip, username, id_golongan")
      .eq("id_user", data.id_user)
      .maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!existing) throw new Error("User tidak ditemukan");

    const oldStatus = existing.status_kepegawaian as "ASN" | "NON ASN";
    const newStatus = data.status_kepegawaian ?? oldStatus;
    const inputNip = data.nip ? String(data.nip).trim() : null;

    // Tolak ASN → NON ASN
    if (oldStatus === "ASN" && newStatus === "NON ASN") {
      throw new Error("Status ASN tidak dapat diubah menjadi NON ASN");
    }

    const isTransition = oldStatus === "NON ASN" && newStatus === "ASN";

    const baseUpdate: Record<string, unknown> = {
      nama: data.nama,
      role_user: data.role_user,
      is_kepala_uptd: data.is_kepala_uptd,
      jabatan: data.jabatan,
      unit: data.unit,
      updated_at: new Date().toISOString(),
    };

    if (isTransition) {
      if (!inputNip) throw new Error("NIP wajib diisi saat mengubah status menjadi ASN");
      if (data.id_golongan == null) throw new Error("Golongan wajib diisi untuk ASN");

      // Cek NIP unik
      const { data: dupe } = await supabaseAdmin
        .from("master_user")
        .select("id_user")
        .eq("nip", inputNip)
        .maybeSingle();
      if (dupe && dupe.id_user !== data.id_user) {
        throw new Error("NIP sudah terdaftar pada user lain");
      }

      baseUpdate.status_kepegawaian = "ASN";
      baseUpdate.nip = inputNip;
      baseUpdate.id_golongan = data.id_golongan;
    } else if (newStatus === "ASN") {
      // Sudah ASN sebelumnya — id_golongan boleh diubah, NIP tidak
      baseUpdate.id_golongan = data.id_golongan;
    } else {
      // Tetap NON ASN
      baseUpdate.id_golongan = null;
    }

    const { error: updErr } = await supabaseAdmin
      .from("master_user")
      .update(baseUpdate)
      .eq("id_user", data.id_user);
    if (updErr) throw new Error(updErr.message);

    // Sinkron auth.users.email kalau ada transisi (email_internal berubah)
    if (isTransition) {
      const { data: refreshed, error: refErr } = await supabaseAdmin
        .from("master_user")
        .select("email_internal")
        .eq("id_user", data.id_user)
        .single();
      if (refErr || !refreshed?.email_internal) {
        // rollback
        await supabaseAdmin
          .from("master_user")
          .update({
            status_kepegawaian: "NON ASN",
            nip: null,
            id_golongan: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id_user", data.id_user);
        throw new Error("Gagal membaca email baru, perubahan dibatalkan");
      }

      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
        data.id_user,
        { email: refreshed.email_internal, email_confirm: true },
      );
      if (authErr) {
        // rollback row
        await supabaseAdmin
          .from("master_user")
          .update({
            status_kepegawaian: "NON ASN",
            nip: null,
            id_golongan: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id_user", data.id_user);
        throw new Error(`Gagal sinkron email login: ${authErr.message}`);
      }
    }

    return { ok: true, transitioned: isTransition };
  });
