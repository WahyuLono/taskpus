import { useEffect, useState } from "react";
import logoPuskesmas from "@/assets/logo-puskesmas.png";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notifikasi/notification-bell";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AuthLayout,
});

type NavItem = { to: string; icon: string; label: string; adminOnly?: boolean };

const NAV: NavItem[] = [
  { to: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { to: "/lpd", icon: "description", label: "Daftar LPD" },
  { to: "/lpd/baru", icon: "add_circle", label: "Buat SPT", adminOnly: true },
  { to: "/tugas", icon: "assignment_ind", label: "Tugas Saya" },
  { to: "/master", icon: "database", label: "Data Master", adminOnly: true },
];

function AuthLayout() {
  const { data: me, isReady } = useCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setSidebarOpen(false), [location.pathname]);

  const isAdmin = me?.role_user === "Admin";
  // While the profile is still loading, hide role-gated items instead of
  // showing them or the non-admin subset — prevents a flash of the wrong nav.
  const visible = isReady ? NAV.filter((n) => !n.adminOnly || isAdmin) : [];

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-surface-container-low">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-on-surface/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[260px] bg-sidebar border-r border-sidebar-border flex flex-col transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-[72px] flex items-center gap-3 px-6 border-b border-sidebar-border">
          <img
            src={logoPuskesmas}
            alt="UPTD Puskesmas Kumai"
            className="h-10 w-10 object-contain shrink-0"
          />
          <div>
            <div className="font-bold text-sidebar-foreground tracking-tight">TASKPUS</div>
            <div className="text-[11px] text-on-surface-variant -mt-0.5">UPTD Puskesmas Kumai</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visible.map((item) => {
            const active =
              location.pathname === item.to ||
              (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors relative",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-on-surface-variant hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-primary" />
                )}
                <span className="material-symbols-outlined !text-[20px]">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border text-[11px] text-on-surface-variant">
          v1.0 • © UPTD
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-[260px]">
        {/* Header */}
        <header className="h-[72px] sticky top-0 z-20 bg-surface-container-lowest border-b border-outline-variant flex items-center gap-4 px-6">
          <button
            className="lg:hidden h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-surface-container"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <div className="flex-1 min-w-0">
            <PageTitle pathname={location.pathname} />
          </div>

          <NotificationBell />



          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 px-2 py-1.5 rounded-full hover:bg-surface-container">
                <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  {(me?.nama ?? "U").slice(0, 1).toUpperCase()}
                </div>
                <div className="hidden md:flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold text-on-surface">
                    {!isReady ? "Memuat…" : (me?.nama ?? "Pengguna")}
                  </span>
                  <div className="flex items-center gap-1">
                    {me?.role_user && (
                      <RoleBadge
                        kind={
                          me.is_kepala_uptd
                            ? "kepala"
                            : me.status_kepegawaian === "ASN"
                              ? "asn"
                              : "non-asn"
                        }
                      >
                        {me.is_kepala_uptd
                          ? "KEPALA UPTD"
                          : me.status_kepegawaian}
                      </RoleBadge>
                    )}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold">{me?.nama}</span>
                  <span className="text-xs text-on-surface-variant">{me?.nip ? `NIP ${me.nip}` : `@${me?.username ?? ""}`}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profil" className="cursor-pointer">
                  <span className="material-symbols-outlined !text-[18px] mr-2">person</span>
                  Profil Saya
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <span className="material-symbols-outlined !text-[18px] mr-2">logout</span>
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function PageTitle({ pathname }: { pathname: string }) {
  const map: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/lpd/baru": "Buat Surat Perintah Tugas",
    "/lpd": "Daftar LPD",
    "/tugas": "Tugas Saya",
    "/master/golongan": "Data Master · Golongan",
    "/master/rangka": "Data Master · Rangka Kegiatan",
    "/master/tempat": "Data Master · Tempat Tujuan",
    "/master/user": "Data Master · User Pegawai",
    "/master": "Data Master",
  };
  const title =
    Object.entries(map).find(([k]) => pathname === k || pathname.startsWith(k + "/"))?.[1] ??
    "TASKPUS";
  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold text-on-surface leading-tight">{title}</h1>
    </div>
  );
}

function RoleBadge({
  kind,
  children,
}: {
  kind: "asn" | "non-asn" | "kepala";
  children: React.ReactNode;
}) {
  const cls =
    kind === "asn"
      ? "bg-primary/10 text-primary"
      : kind === "kepala"
        ? "bg-secondary/15 text-secondary"
        : "bg-on-surface-variant/15 text-on-surface-variant";
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide",
        cls,
      )}
    >
      {children}
    </span>
  );
}
