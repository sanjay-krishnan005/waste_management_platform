/**
 * Attach a Supabase auth user to the demo org with a role.
 * Usage: node scripts/attach-user.mjs <email> <role>
 * Example: node scripts/attach-user.mjs assassinnightcap008@gmail.com admin
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../apps/web/.env");
const env = readFileSync(envPath, "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();

const email = process.argv[2];
const role = process.argv[3] || "admin";
const ORG_ID = "a0000000-0000-4000-8000-000000000001";

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SERVICE_ROLE_KEY in apps/web/.env");
  process.exit(1);
}
if (!email) {
  console.error("Usage: node scripts/attach-user.mjs <email> [role]");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
if (authErr) {
  console.error("Auth error:", authErr.message);
  process.exit(1);
}

const user = authData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No auth user found for: ${email}`);
  console.log("Users in project:", authData.users.map((u) => u.email).join(", "));
  process.exit(1);
}

// Ensure org exists
await supabase.from("organizations").upsert({
  id: ORG_ID,
  name: "Sortyx Demo",
  slug: "sortyx-demo",
});

const { data: existing } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

if (!existing) {
  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || email.split("@")[0],
    role,
    organization_id: ORG_ID,
  });
  if (error) {
    console.error("Insert profile failed:", error.message);
    console.error("\n→ Run migrations first: paste supabase/migrations/001_initial_schema.sql in SQL Editor");
    process.exit(1);
  }
  console.log("Created profile and attached as", role);
} else {
  const { error } = await supabase
    .from("profiles")
    .update({ role, organization_id: ORG_ID })
    .eq("id", user.id);
  if (error) {
    console.error("Update failed:", error.message);
    process.exit(1);
  }
  console.log("Updated profile:", email, "→ role:", role, "org:", ORG_ID);
}

const { data: profile } = await supabase.from("profiles").select("email, role, organization_id").eq("id", user.id).single();
console.log("Done:", profile);
