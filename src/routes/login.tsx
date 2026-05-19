import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const raw = identifier.trim();
    // NIP = semua digit; selain itu dianggap username (lower-case)
    const id = /^[0-9]+$/.test(raw) ? raw : raw.toLowerCase();
    const email = `${id}@lpd.internal`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Login gagal", { description: error.message });
      return;
    }
    toast.success("Login berhasil");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-surface-container-low flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-card">
            <span className="material-symbols-outlined !text-[28px]">apartment</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-on-surface">TASKPUS</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Manajemen Laporan Perjalanan Dinas
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
