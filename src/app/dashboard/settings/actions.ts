"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateMyProfile(formData: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };

  const display_name = (formData.get("display_name") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const photos_public_by_default = formData.get("photos_public_by_default") === "on";

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name,
      phone,
      photos_public_by_default,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/layout");
  return { error: null };
}
