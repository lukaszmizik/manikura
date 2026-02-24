/**
 * Skript pro vygenerování 5 testovacích účtů (klientek).
 * Jména: mix českých a ruských.
 *
 * Použití:
 *   1. Do .env.local: SUPABASE_SERVICE_ROLE_KEY=... (Settings → API → service_role)
 *   2. Pokud dostanete "User not allowed": buď v Supabase vypněte/upravte Auth Hook
 *      (Authentication → Hooks → Before user created), nebo nastavte povolenou doménu:
 *      TEST_EMAIL_DOMAIN=vase-domena.cz
 *   3. npx tsx scripts/seed-test-users.ts
 *
 * Všechny účty mají heslo: Test1234!
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Načtení .env.local (Next.js nečte .env.local v Node skriptech)
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_EMAIL_DOMAIN = process.env.TEST_EMAIL_DOMAIN || "example123.cz";

const TEST_PASSWORD = "Test1234!";

const TEST_USERS_BASE: { displayName: string; localPart: string }[] = [
  { displayName: "Anna Nováková", localPart: "anna.novakova.test" },
  { displayName: "Maria Ivanova", localPart: "maria.ivanova.test" },
  { displayName: "Elena Petrova", localPart: "elena.petrova.test" },
  { displayName: "Jana Svobodová", localPart: "jana.svobodova.test" },
  { displayName: "Olga Sokolova", localPart: "olga.sokolova.test" },
];

const TEST_USERS = TEST_USERS_BASE.map((u) => ({
  displayName: u.displayName,
  email: `${u.localPart}@${TEST_EMAIL_DOMAIN}`,
}));

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY v .env.local."
    );
    console.error(
      "Service role key: Supabase Dashboard → Settings → API → Project API keys → service_role (secret, dlouhý řetězec začínající eyJ...)"
    );
    process.exit(1);
  }

  // Service role klíč je JWT (začíná eyJ), ne UUID
  if (!SUPABASE_SERVICE_ROLE_KEY.startsWith("eyJ")) {
    console.error(
      "SUPABASE_SERVICE_ROLE_KEY nevypadá jako platný klíč (má začínat eyJ...)."
    );
    console.error(
      "V Supabase: Dashboard → Settings → API. V sekci „Project API keys“ zkopírujte celý řetězec u „service_role“ (Reveal → Copy), ne jiný identifikátor."
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Ověření projektu – musí být stejný jako v Supabase Dashboard
  const projectRef = SUPABASE_URL.replace(/^https:\/\//, "").split(".")[0];
  console.log("Připojeno k projektu:", projectRef, "| URL:", SUPABASE_URL);
  console.log(
    "→ V Dashboardu zkontrolujte, že jste v projektu s touto URL (Settings → API).\n"
  );

  // Ověření, že service role klíč funguje (např. listUsers)
  const { error: testError } = await supabase.auth.admin.listUsers({ perPage: 1 });
  if (testError) {
    const status = (testError as { status?: number }).status;
    console.error("Chyba při ověření připojení (listUsers):", testError.message);
    console.error("Status:", status);
    if (status === 403) {
      console.error("");
      console.error("403 = nemáte oprávnění. V .env.local musí být SERVICE ROLE klíč, ne ANON.");
      console.error("V Supabase: Settings → API. Pod 'Project API keys' jsou dva klíče:");
      console.error("  - anon (public) – ten NEPOUŽÍVAT pro tento skript");
      console.error("  - service_role (secret) – Reveal → Copy a vložit do SUPABASE_SERVICE_ROLE_KEY");
      console.error("");
    }
    process.exit(1);
  }
  console.log("Service role klíč je v pořádku (připojení k Auth API funguje).");

  console.log("E-mailová doména pro účty:", TEST_EMAIL_DOMAIN);
  console.log("Vytvářím 5 testovacích účtů...\n");

  let notAllowedHintShown = false;
  for (const { displayName, email } of TEST_USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: displayName, role: "client" },
    });

    if (error) {
      if (error.message.includes("already been registered")) {
        console.log(`⏭  ${displayName} (${email}) – účet již existuje`);
      } else {
        console.error(`❌ ${displayName} (${email}): ${error.message}`);
        const err = error as { status?: number; name?: string };
        if (err.status !== undefined) console.error("   Status:", err.status);
        if (err.name) console.error("   Typ:", err.name);
        console.error("   Celá chyba (pro diagnostiku):", JSON.stringify(error, null, 2));
        if (error.message.includes("not allowed") && !notAllowedHintShown) {
          notAllowedHintShown = true;
          console.error(
            "\n   → Pravděpodobně Auth Hook (Authentication → Hooks → Before user created) blokuje."
          );
          console.error(
            "   → V Supabase hook úplně odstraňte (Delete) a chvíli počkejte, pak skript znovu spusťte.\n"
          );
        }
      }
      continue;
    }

    const userId = data.user?.id;
    if (userId) {
      await supabase.from("profiles").upsert(
        {
          id: userId,
          email,
          display_name: displayName,
          role: "client",
        },
        { onConflict: "id" }
      );
    }
    console.log(`✅ ${displayName} (${email}) – id: ${userId ?? "?"}`);
  }

  console.log("\nHotovo. Heslo pro všechny účty: " + TEST_PASSWORD);

  // Ověření: účty by měly být v Authentication → Users
  const testEmails = TEST_USERS.map((u) => u.email);
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const found = (list?.users ?? []).filter((u) => u.email && testEmails.includes(u.email));
  console.log("\nV tomto projektu je nyní", found.length, "z 5 testovacích účtů v auth.users.");
  if (found.length === 0 && list?.users && list.users.length > 0) {
    console.log(
      "→ Pokud v Dashboardu tyto účty nevidíte, jste pravděpodobně v jiném projektu. Otevřete projekt s URL:",
      SUPABASE_URL
    );
  }
}

main().catch((err) => {
  console.error("Chyba:", err);
  process.exit(1);
});
