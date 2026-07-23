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

    // Prefer getUser() — validates the token with Supabase Auth — falling back
    // to the local session if the server call fails (e.g. offline).
    (async () => {
      const { data: userData, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!error && userData.user) {
        setUserId(userData.user.id);
        setReady(true);
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!mounted) return;
      setUserId(sess.session?.user.id ?? null);
      setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
      setReady(true);
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
  // isReady = we know either the profile or that there's no session at all.
  // While false, callers should show a skeleton instead of falling back to
  // a "guest / non-admin" UI (which would flash before the profile lands).
  const isReady = ready && (!userId || q.isSuccess || q.isError);
  return { ...q, ready, userId, isReady };
}
