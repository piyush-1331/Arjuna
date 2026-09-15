import "dotenv/config";
import { validatePasswordStrength } from "../shared/passwordPolicy";
import { isSupabaseConfigured, supabaseAdmin } from "./supabase";
import * as db from "./db";

export async function seedSingleAdministrator() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();

  if (!adminEmail || !adminPassword) {
    console.error("❌ ERROR: Both ADMIN_EMAIL and ADMIN_PASSWORD server environment variables must be defined.");
    process.exit(1);
  }

  if (!adminEmail.includes("@")) {
    console.error("❌ ERROR: ADMIN_EMAIL must be a valid email address.");
    process.exit(1);
  }

  const passwordValidation = validatePasswordStrength(adminPassword);
  if (!passwordValidation.isValid) {
    console.error(`❌ ERROR: ADMIN_PASSWORD fails password security policy: ${passwordValidation.errors.join("; ")}`);
    process.exit(1);
  }

  console.log(`🔒 Checking administrator provisioning for: ${adminEmail}...`);

  // Check if an admin already exists in the system
  const allUsers = await db.listUsers();
  const existingAdmins = allUsers.filter(u => u.role === "admin" || u.role === "administrator");

  if (existingAdmins.length > 0) {
    const primaryAdmin = existingAdmins[0];
    if (primaryAdmin.email?.toLowerCase() === adminEmail.toLowerCase()) {
      if (primaryAdmin.status === "APPROVED") {
        console.log(`✅ Configured main administrator account (${adminEmail}) is already provisioned and APPROVED.`);
        return { success: true, message: "Administrator already provisioned and active." };
      } else {
        await db.approveStaffUser("system_bootstrap", primaryAdmin.id);
        console.log(`✅ Configured main administrator account (${adminEmail}) reactivated and set to APPROVED.`);
        return { success: true, message: "Administrator reactivated." };
      }
    } else {
      console.error(`❌ CRITICAL SAFETY ERROR: An administrator account already exists with a different email (${primaryAdmin.email}).`);
      console.error("Single-administrator policy prohibits automatic multi-admin creation. Manual migration is required.");
      process.exit(1);
    }
  }

  // If Supabase is configured, create or sync Supabase Auth User
  let authUserId = `admin-${Date.now()}`;
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      // List existing auth users to check if auth record already exists
      const { data: userList, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (listErr) {
        console.warn("⚠️ Warning checking Supabase auth users:", listErr.message);
      }
      
      const existingAuth = userList?.users?.find(u => u.email?.toLowerCase() === adminEmail.toLowerCase());
      if (existingAuth) {
        authUserId = existingAuth.id;
        // Update password if needed
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          password: adminPassword,
          email_confirm: true,
          user_metadata: {
            full_name: "District Health Administrator",
            selected_role: "admin",
          },
        });
      } else {
        const { data: createdAuth, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,
          user_metadata: {
            full_name: "District Health Administrator",
            selected_role: "admin",
          },
        });
        if (createErr) {
          console.error("❌ Failed to create Supabase Auth admin user:", createErr.message);
          process.exit(1);
        }
        if (createdAuth?.user) {
          authUserId = createdAuth.user.id;
        }
      }
    } catch (e: any) {
      console.warn("⚠️ Supabase Auth provisioning notice:", e?.message);
    }
  }

  // Upsert profile for the single administrator
  await db.upsertUser({
    openId: authUserId,
    authId: authUserId,
    name: "District Health Administrator",
    email: adminEmail,
    role: "admin",
    status: "APPROVED",
    phone: "+91 94221 00001",
    designation: "Chief Medical Officer / District Administrator",
    district: "Nandurbar",
    facilityName: "District Health Executive Office",
    approvedAt: new Date(),
    approvedBy: "system_bootstrap",
    loginMethod: "supabase",
  });

  console.log(`✅ Exactly one main administrator successfully provisioned: ${adminEmail}`);
  return { success: true, message: "Administrator provisioned successfully." };
}

// If run directly via CLI
if (process.argv[1]?.includes("seedAdmin")) {
  seedSingleAdministrator()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Provisioning failed:", err);
      process.exit(1);
    });
}
