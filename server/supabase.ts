import { createClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";

export const isSupabaseConfigured = Boolean(
  ENV.supabaseUrl && ENV.supabasePublishableKey && ENV.supabaseServiceRoleKey,
);

export const isSupabaseDataActive = Boolean(
  isSupabaseConfigured && (process.env.NODE_ENV !== "test" || process.env.TEST_SUPABASE === "true"),
);

export const supabaseAdmin = isSupabaseConfigured
  ? createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

export async function getSupabaseAuthUser(accessToken: string) {
  if (!ENV.supabaseUrl || !ENV.supabasePublishableKey || !accessToken) return null;
  const response = await fetch(`${ENV.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: ENV.supabasePublishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) return null;
  return (await response.json()) as {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  };
}
