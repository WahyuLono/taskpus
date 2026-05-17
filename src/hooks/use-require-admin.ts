import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";

export function useRequireAdmin() {
  const { data: me, isLoading } = useCurrentUser();
  const navigate = useNavigate();
  useEffect(() => {
    if (isLoading) return;
    if (!me || me.role_user !== "Admin") {
      toast.error("Halaman ini hanya untuk Admin");
      navigate({ to: "/dashboard" });
    }
  }, [me, isLoading, navigate]);
  return { isAdmin: me?.role_user === "Admin", isLoading };
}
