import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveLoginEmail } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoPuskesmas from "@/assets/logo-puskesmas.png";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const resolve = useServerFn(resolveLoginEmail);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const raw = identifier.trim();
    try {
      let email: string | null = null;
      try {
        const r = await resolve({ data: { identifier: raw } });
        email = r.email;
      } catch {
        // ignore — fall through to naive guess to avoid leaking enumeration
      }
      if (!email) {
        const id = /^[0-9]+$/.test(raw) ? raw : raw.toLowerCase();
        email = `${id}@lpd.internal`;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("Login gagal", { description: error.message });
        return;
      }
      toast.success("Login berhasil");
      navigate({ to: "/dashboard" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-low flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src={logoPuskesmas}
            alt="UPTD Puskesmas Kumai"
            className="mx-auto h-24 w-24 object-contain"
          />
          <h1 className="mt-4 text-2xl font-bold text-on-surface">TASKPUS</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            UPTD Puskesmas Kumai
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-card rounded-xl p-6 shadow-card border border-outline-variant space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="identifier">NIP / Username</Label>
            <Input
              id="identifier"
              autoFocus
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Masukkan NIP atau username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Kata Sandi</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11">
            {loading ? "Memproses…" : "Masuk"}
          </Button>
          <p className="text-xs text-on-surface-variant text-center">
            Akses dikelola oleh Admin sistem.
          </p>
        </form>
      </div>
    </div>
  );
}
