import "dotenv/config";
import { ENV } from "../server/_core/env";
import { isSupabaseConfigured, supabaseAdmin } from "../server/supabase";
import { updateUserProfile, getUserById, getUserByOpenId } from "../server/supabaseDb";

async function test() {
  console.log("=== Testing Profile Update and Persistence ===");
  if (!supabaseAdmin) {
    console.log("Supabase Admin not configured");
    return;
  }

  // 1. Get first user
  const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr || !users?.users?.length) {
    console.log("No auth users found to test:", listErr);
    return;
  }

  const testAuthUser = users.users[0];
  console.log("Testing with auth user:", testAuthUser.id, testAuthUser.email);

  // Check profiles row
  const { data: profileRow } = await supabaseAdmin.from("profiles").select("*").eq("auth_id", testAuthUser.id).maybeSingle();
  console.log("Profiles row found:", profileRow?.id, profileRow?.name);

  if (profileRow?.id) {
    const result = await updateUserProfile(profileRow.id, {
      name: "District Health Administrator",
      phone: "+91 98221 11223",
      dateOfBirth: "1990-05-12",
      age: 36,
      gender: "female",
      village: "Karanji Budruk",
      district: "Ahmedabad Rural",
      emergencyContactName: "Ramesh Sharma",
      emergencyContactPhone: "+91 98221 99887",
      bloodGroup: "O+",
      allergies: "Penicillin, Dust",
      conditions: "Hypertension",
      address: "Gram Panchayat Road",
      pincode: "423101",
      abhaId: "91-8201-9999",
    });

    console.log("\nUpdateUserProfile result:", result);

    const fetched = await getUserById(profileRow.id);
    console.log("\nFetched UserById:", fetched);
  }
}

test().catch(console.error);
