import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser, type CurrentUser } from "@/lib/me.functions";

function isAuthError(error: unknown): boolean {
  if (error instanceof Response && error.status === 401) return true;
  if (error && typeof error === "object" && "status" in error && error.status === 401) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.toLowerCase().includes("unauthorized");
}

export function useSession() {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Read the persisted session directly — this is a fast, local, offline-safe
    // lookup. Avoid supabase.auth.getUser() here: it hits the network and, when
    // it fails (CORS, cold start on the published domain, transient 5xx from
    // Supabase Auth), can resolve with { user: null } and blank out the userId
    // we actually have in localStorage — leaving the profile query disabled
    // and the UI stuck on the "Pengguna" fallback. Token validation still
    // happens server-side inside every requireSupabaseAuth server function.
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!mounted) return;
      setUserId(sess.session?.user.id ?? null);
      setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!mounted) return;
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
    queryFn: async () => {
      try {
        return await fetchMe();
      } catch (error) {
        if (isAuthError(error)) return null;
        throw error;
      }
    },
    enabled: ready && !!userId,
    staleTime: 60_000,
    retry: false,
    throwOnError: false,
  });
  // isReady = we know either the profile or that there's no session at all.
  // While false, callers should show a skeleton instead of falling back to
  // a "guest / non-admin" UI (which would flash before the profile lands).
  const isReady = ready && (!userId || q.isSuccess || q.isError);
  return { ...q, ready, userId, isReady };
}
