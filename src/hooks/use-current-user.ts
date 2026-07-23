import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser, type CurrentUser } from "@/lib/me.functions";

export function useSession() {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.session?.user.id ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { ready, userId };
}

export function useCurrentUser() {
  const { ready, userId } = useSession();
  const fetchMe = useServerFn(getCurrentUser);
  const q = useQuery<CurrentUser | null>({
    queryKey: ["current-user", userId],
    queryFn: () => fetchMe(),
    enabled: ready && !!userId,
    staleTime: 60_000,
  });
  return { ...q, ready, userId };
}
