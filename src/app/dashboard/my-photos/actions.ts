"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function setPhotoPublic(photoId: string, isPublic: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni" };

  const { error } = await supabase
    .from("visit_photos")
    .update({ public: isPublic })
    .eq("id", photoId)
    .eq("client_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/my-photos");
  revalidatePath("/inspirace");
  return { error: null };
}
