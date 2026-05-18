import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";

export function useRequireAdmin() {
  const { data: me, ready, userId, isFetching, isSuccess } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return; // session bootstrap not done
    if (!userId) return; // not logged in — _authenticated layout handles it
    if (isFetching || !isSuccess) return; // profile still loading
    if (!me || me.role_user !== "Admin") {
      toast.error("Halaman ini hanya untuk Admin");
      navigate({ to: "/dashboard" });
    }
  }, [ready, userId, isFetching, isSuccess, me, navigate]);

  return {
    isAdmin: me?.role_user === "Admin",
    isLoading: !ready || (!!userId && (isFetching || !isSuccess)),
  };
}
