import "dotenv/config";
import { ENV } from "./server/_core/env";
import { isSupabaseConfigured, supabaseAdmin } from "./server/supabase";

async function check() {
  console.log("=== SUPABASE CONFIGURATION STATUS ===");
  console.log("VITE_SUPABASE_URL:", ENV.supabaseUrl ? `Configured (${ENV.supabaseUrl})` : "MISSING (Not set)");
  console.log("VITE_SUPABASE_PUBLISHABLE_KEY:", ENV.supabasePublishableKey ? `Configured (${ENV.supabasePublishableKey.substring(0, 12)}...)` : "MISSING (Not set)");
  console.log("SUPABASE_SERVICE_ROLE_KEY:", ENV.supabaseServiceRoleKey ? `Configured (${ENV.supabaseServiceRoleKey.substring(0, 12)}...)` : "MISSING (Not set)");
  console.log("isSupabaseConfigured (Server Admin):", isSupabaseConfigured);

  if (!isSupabaseConfigured) {
    console.log("\n[RESULT] Supabase is NOT connected because the required environment variables are missing.");
    return;
  }

  console.log("\nTesting connection to Supabase...");
  try {
    const res = await fetch(`${ENV.supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: ENV.supabaseServiceRoleKey,
        Authorization: `Bearer ${ENV.supabaseServiceRoleKey}`,
      },
    });
    console.log("REST Endpoint status:", res.status, res.statusText);
    if (res.ok) {
      console.log("[RESULT] Supabase is CONNECTED successfully!");
      if (supabaseAdmin) {
        console.log("\n--- Checking profiles table columns ---");
        const { data, error } = await supabaseAdmin.from("profiles").select("*").limit(1);
        if (error) {
          console.error("Error reading profiles:", error);
        } else {
          console.log("Existing columns in profiles table:", data && data.length > 0 ? Object.keys(data[0]) : "No rows found, querying schema");
          if (data && data.length > 0) console.log("Sample row:", data[0]);
        }

        const candidateFields = [
          "name", "phone", "district", "village", "date_of_birth", "age", "gender",
          "emergency_contact_name", "emergency_contact_phone", "blood_group",
          "allergies", "conditions", "address", "pincode", "abha_id", "avatar_url"
        ];
        console.log("\n--- Testing Supabase Auth Admin metadata update ---");
        try {
          const { data: usersList, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
          if (listErr) {
            console.log("Auth Admin listUsers failed:", listErr.message);
          } else {
            console.log(`Auth Admin listUsers success! Total auth users: ${usersList.users.length}`);
            if (usersList.users.length > 0) {
              const u = usersList.users[0];
              console.log("First auth user ID:", u.id, "Email:", u.email, "Metadata:", u.user_metadata);
            }
          }
        } catch (e: any) {
          console.log("Auth Admin error:", e.message);
        }
      }
    } else {
      console.log("[RESULT] Supabase connection failed with status", res.status);
    }
  } catch (err: any) {
    console.log("[RESULT] Connection error:", err.message);
  }
}

check();
