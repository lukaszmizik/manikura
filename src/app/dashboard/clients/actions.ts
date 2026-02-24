"use server";

import { createClient, createServerAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isGuestProfile } from "@/lib/clients";

function isAppAdmin(profileRole: string | null | undefined, userEmail: string | undefined): boolean {
  if (profileRole === "admin") return true;
  const env =
    typeof process !== "undefined" && process.env?.NEXT_PUBLIC_ADMIN_EMAILS
      ? process.env.NEXT_PUBLIC_ADMIN_EMAILS
      : "";
  const emails = env.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !!userEmail && emails.includes(userEmail.toLowerCase());
}

/** Admin: vrátí kód pro propojení host účtu, pokud existuje. */
export async function getClaimCodeForGuest(guestProfileId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAppAdmin(profile?.role ?? null, user.email)) return null;
  const adminClient = createServerAdminClient();
  const { data: row } = await adminClient
    .from("guest_claim_codes")
    .select("code")
    .eq("user_id", guestProfileId)
    .single();
  return (row as { code: string } | null)?.code ?? null;
}

/**
 * Propojí host profil s reálným účtem klientky: převede všechna data a smaže host účet.
 * Volá jen admin. realClientEmail = e-mail již registrované klientky.
 */
export async function mergeGuestIntoClient(
  guestProfileId: string,
  realClientEmail: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAppAdmin(profile?.role ?? null, user.email)) return { error: "Pouze pro admina." };

  const emailTrimmed = realClientEmail.trim().toLowerCase();
  if (!emailTrimmed) return { error: "Zadejte e-mail klientky." };
  if (guestProfileId === emailTrimmed) return { error: "Zadejte e-mail reálného účtu, ne hosta." };

  const adminClient = createServerAdminClient();

  const { data: guestProfile } = await adminClient
    .from("profiles")
    .select("id, email, role")
    .eq("id", guestProfileId)
    .single();
  if (!guestProfile) return { error: "Host profil nenalezen." };
  const guestEmail = (guestProfile as { email: string | null }).email;
  if (!isGuestProfile(guestEmail)) return { error: "Tento profil není host účet (nelze propojit)." };

  const { data: realProfiles } = await adminClient
    .from("profiles")
    .select("id, email, role")
    .eq("role", "client");
  const realProfile = (realProfiles ?? []).find(
    (p) => (p as { email: string | null }).email?.toLowerCase() === emailTrimmed
  );
  if (!realProfile) return { error: "Klientka s tímto e-mailem nebyla nalezena. Zadejte e-mail stejně jako při registraci." };
  const realId = (realProfile as { id: string }).id;
  if ((realProfile as { role: string }).role !== "client") return { error: "Cílový účet není klientka." };
  if (realId === guestProfileId) return { error: "Host a cíl jsou stejný účet." };

  const updates: Array<() => Promise<{ error: { message: string } | null }>> = [
    async () => ({ error: (await adminClient.from("appointments").update({ client_id: realId }).eq("client_id", guestProfileId)).error }),
    async () => ({ error: (await adminClient.from("visits").update({ client_id: realId }).eq("client_id", guestProfileId)).error }),
    async () => ({ error: (await adminClient.from("visit_photos").update({ client_id: realId }).eq("client_id", guestProfileId)).error }),
    async () => ({ error: (await adminClient.from("client_ratings").update({ client_id: realId }).eq("client_id", guestProfileId)).error }),
    async () => ({ error: (await adminClient.from("client_warnings").update({ client_id: realId }).eq("client_id", guestProfileId)).error }),
    async () => ({ error: (await adminClient.from("appointment_change_requests").update({ client_id: realId }).eq("client_id", guestProfileId)).error }),
    async () => ({ error: (await adminClient.from("notifications").update({ user_id: realId }).eq("user_id", guestProfileId)).error }),
  ];

  const names = ["appointments", "visits", "visit_photos", "client_ratings", "client_warnings", "appointment_change_requests", "notifications"];
  for (let i = 0; i < updates.length; i++) {
    const { error } = await updates[i]();
    if (error) return { error: `Převod dat (${names[i]}): ${error.message}` };
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(guestProfileId);
  if (deleteError) return { error: `Host účet se nepodařilo odstranit: ${deleteError.message}` };

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/clients/[id]");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/clients/[id]");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/terms");
  return { error: null };
}

/**
 * Klientka: propojí host účet pomocí kódu od manikérky. Data z host účtu se převedou na aktuálního uživatele.
 */
export async function claimGuestByCode(code: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };

  const codeTrimmed = code.trim().toUpperCase();
  if (!codeTrimmed || codeTrimmed.length < 4) return { error: "Zadejte platný kód." };

  const adminClient = createServerAdminClient();
  const { data: claimRow } = await adminClient
    .from("guest_claim_codes")
    .select("user_id")
    .eq("code", codeTrimmed)
    .single();
  if (!claimRow) return { error: "Kód nebyl nalezen. Zkontrolujte ho nebo požádejte manikérku o nový." };
  const guestId = (claimRow as { user_id: string }).user_id;
  if (guestId === user.id) return { error: "Tento kód již patří vašemu účtu." };

  const realId = user.id;

  const updates: Array<() => Promise<{ error: { message: string } | null }>> = [
    async () => ({ error: (await adminClient.from("appointments").update({ client_id: realId }).eq("client_id", guestId)).error }),
    async () => ({ error: (await adminClient.from("visits").update({ client_id: realId }).eq("client_id", guestId)).error }),
    async () => ({ error: (await adminClient.from("visit_photos").update({ client_id: realId }).eq("client_id", guestId)).error }),
    async () => ({ error: (await adminClient.from("client_ratings").update({ client_id: realId }).eq("client_id", guestId)).error }),
    async () => ({ error: (await adminClient.from("client_warnings").update({ client_id: realId }).eq("client_id", guestId)).error }),
    async () => ({ error: (await adminClient.from("appointment_change_requests").update({ client_id: realId }).eq("client_id", guestId)).error }),
    async () => ({ error: (await adminClient.from("notifications").update({ user_id: realId }).eq("user_id", guestId)).error }),
  ];
  const names = ["appointments", "visits", "visit_photos", "client_ratings", "client_warnings", "appointment_change_requests", "notifications"];
  for (let i = 0; i < updates.length; i++) {
    const { error } = await updates[i]();
    if (error) return { error: `Převod dat: ${error.message}` };
  }

  await adminClient.from("guest_claim_codes").delete().eq("user_id", guestId);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(guestId);
  if (deleteError) return { error: `Účet se nepodařilo propojit: ${deleteError.message}` };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/terms");
  revalidatePath("/dashboard/settings");
  return { error: null };
}

/**
 * Zpracuje kód od manikérky uložený v user_metadata (registrace s ověřením e-mailu).
 * Volá se po prvním přihlášení z dashboardu.
 */
export async function processPendingClaimCode(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: null };
  const code = (user.user_metadata as { claim_code?: string } | null)?.claim_code;
  if (!code || typeof code !== "string" || code.trim().length < 4) return { error: null };

  const result = await claimGuestByCode(code.trim().toUpperCase());
  const adminClient = createServerAdminClient();
  await adminClient.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, claim_code: null },
  });
  return result;
}
