import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useState } from "react";

export function useAuth() {
  const [session, setSession] = useState<Awaited<ReturnType<NonNullable<typeof supabase>["auth"]["getSession"]>>["data"]["session"]>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const utils = trpc.useUtils();
  const logoutMutation = trpc.auth.logout.useMutation();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: Boolean(session) || !supabase,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!supabase) {
      setSessionLoading(false);
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionLoading(false);
      void utils.auth.me.invalidate();
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [utils]);

  const logout = useCallback(async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn("[Auth] Supabase signOut warning:", e);
    }

    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Ignore server session cleanup failure
    }

    try {
      localStorage.removeItem("arjuna.pendingRole");
      sessionStorage.removeItem("manus-cookie");
    } catch {
      // Ignore storage errors
    }

    setSession(null);
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();

    // Redirect to home/login screen
    if (typeof window !== "undefined") {
      window.location.assign("/");
    }
  }, [utils, logoutMutation]);

  return {
    user: meQuery.data ?? null,
    loading: sessionLoading || (Boolean(session) && meQuery.isLoading),
    error: meQuery.error ?? null,
    isAuthenticated: Boolean((session && meQuery.data) || (!supabase && meQuery.data)),
    refresh: () => meQuery.refetch(),
    logout,
  };
}

