import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase = url && key
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

let currentAccessToken: string | null = null;
if (supabase) {
  void supabase.auth.getSession().then(({ data }) => { currentAccessToken = data.session?.access_token ?? null; });
  supabase.auth.onAuthStateChange((_event, session) => { currentAccessToken = session?.access_token ?? null; });
}

export function getSupabaseAccessToken(): string | null {
  if (currentAccessToken) return currentAccessToken;
  if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && ((k.startsWith("sb-") && k.endsWith("-auth-token")) || k.includes("supabase.auth.token"))) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            const token = parsed?.access_token || parsed?.currentSession?.access_token;
            if (typeof token === "string" && token.length > 0) {
              currentAccessToken = token;
              return token;
            }
          }
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }
  return null;
}
