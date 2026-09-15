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

export function getSupabaseAccessToken() {
  return currentAccessToken;
}
