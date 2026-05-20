import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { updateOwnUsername } from "@/lib/me.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profil")({
  component: ProfilPage,
});

function ProfilPage() {
  const { data: me, isLoading } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fnUpdateUsername = useServerFn(updateOwnUsername);

  const [username, setUsername] = useState("");
  const [busyUser, setBusyUser] = useState(false);

  const [pwd, setPwd] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [busyPwd, setBusyPwd] = useState(false);

  // Initial-fill username when data arrives
  if (me && username === "" && me.username) {
    // one-shot prefill; user can still clear it
    setUsername(me.username);
  }

  if (isLoading || !me) {
    return <div className="text-on-surface-variant">Memuat…</div>;
  }

  const isNonAsn = me.status_kepegawaian === "NON ASN";

  const saveUsername = async () => {
    const u = username.trim();
    if (u.length < 1 || u.length > 20) {
      toast.error("Username harus 1–20 karakter");
      return;
    }
    if (/[@\s]/.test(u)) {
      toast.error("Username tidak boleh mengandung spasi atau '@'");
      return;
    }
    setBusyUser(true);
    try {
      const res = await fnUpdateUsername({ data: { username: u } });
      qc.invalidateQueries({ queryKey: ["current-user"] });
      if (res.mustReauth) {
        toast.success("Username diperbarui — silakan login ulang");
        await supabase.auth.signOut();
        navigate({ to: "/login" });
      } else {
        toast.success("Username diperbarui");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Gagal memperbarui username");
    } finally {
      setBusyUser(false);
    }
  };

  const savePassword = async () => {
    if (pwd.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    if (pwd !== pwdConfirm) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }
    setBusyPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      toast.success("Password diperbarui");
      setPwd("");
      setPwdConfirm("");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal memperbarui password");
    } finally {
      setBusyPwd(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-on-surface">Profil Saya</h2>
        <p className="text-sm text-on-surface-variant">
          Kelola username dan password akun Anda.
        </p>
      </div>

      {/* Info Akun */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-on-surface">Informasi Akun</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Info label="Nama" value={me.nama} />
          <Info label="Status" value={me.status_kepegawaian} />
          <Info label="NIP" value={me.nip ?? "-"} mono />
          <Info label="Role" value={me.role_user} />
          <Info label="Jabatan" value={me.jabatan ?? "-"} />
          <Info label="Unit" value={me.unit ?? "-"} />
        </div>
      </section>

      {/* Username */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-on-surface">Ubah Username</h3>
        {isNonAsn && (
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
            <b>Perhatian:</b> Anda berstatus NON ASN. Mengubah username akan
            mengubah identitas login dan Anda akan logout otomatis.
          </div>
        )}
        <div className="space-y-2 max-w-sm">
          <Label>Username</Label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            placeholder="Maks. 20 karakter, tanpa spasi/@"
          />
        </div>
        <div>
          <Button onClick={saveUsername} disabled={busyUser}>
            {busyUser ? "Menyimpan…" : "Simpan Username"}
          </Button>
        </div>
      </section>

      {/* Password */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-on-surface">Ubah Password</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Password Baru</Label>
            <Input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Min. 6 karakter"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label>Konfirmasi Password</Label>
            <Input
              type="password"
              value={pwdConfirm}
              onChange={(e) => setPwdConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <div>
          <Button onClick={savePassword} disabled={busyPwd}>
            {busyPwd ? "Menyimpan…" : "Simpan Password"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-on-surface-variant">
        {label}
      </div>
      <div className={mono ? "font-mono text-sm" : "text-sm"}>{value}</div>
    </div>
  );
}
