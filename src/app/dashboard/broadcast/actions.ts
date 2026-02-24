"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type BroadcastRow = {
  id: string;
  body: string;
  show_from: string;
  show_until: string | null;
  created_at: string;
  created_by: string | null;
};

export async function createBroadcast(formData: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Pouze pro admina." };

  const body = (formData.get("body") as string)?.trim();
  if (!body) return { error: "Zadejte text zprávy." };

  const showFromStr = formData.get("show_from") as string;
  const showUntilStr = formData.get("show_until") as string | null;

  const showFrom = showFromStr ? new Date(showFromStr + "T00:00:00") : new Date();
  const showUntil =
    showUntilStr && showUntilStr.trim()
      ? new Date(showUntilStr + "T23:59:59.999")
      : null;

  if (showUntilStr && showUntil && showUntil.getTime() < showFrom.getTime()) {
    return { error: "Datum do musí být po datu od." };
  }

  const { error } = await supabase.from("admin_broadcasts").insert({
    body,
    show_from: showFrom.toISOString(),
    show_until: showUntil?.toISOString() ?? null,
    created_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/broadcast");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/messages");
  return { error: null };
}
