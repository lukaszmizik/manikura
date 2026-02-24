"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { releaseAppointment } from "@/app/dashboard/calendar/actions";

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni" };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
  return { error: null };
}

/** Smaže jednu notifikaci (pouze vlastní). Po smazání zmizí ze seznamu a z badge. */
export async function deleteNotification(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
  return { error: null };
}

/** Označí všechna upozornění přihlášeného uživatele jako přečtená (např. po otevření stránky Upozornění). */
export async function markAllNotificationsRead(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni" };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
  return { error: null };
}

/** Klientka: vytvoření žádosti o úpravu nebo zrušení termínu (čeká na potvrzení admina). */
export async function createAppointmentChangeRequest(
  appointmentId: string,
  requestType: "edit" | "delete",
  payload: { note?: string | null; change_reason?: string | null } | null
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };

  const { data: apt } = await supabase
    .from("appointments")
    .select("id, client_id, start_at, note")
    .eq("id", appointmentId)
    .single();
  if (!apt || (apt as { client_id: string }).client_id !== user.id) {
    return { error: "Termín nenalezen nebo nemáte oprávnění." };
  }

  const { data: req, error: insertErr } = await supabase
    .from("appointment_change_requests")
    .insert({
      appointment_id: appointmentId,
      client_id: user.id,
      request_type: requestType,
      payload: payload ?? null,
      status: "pending",
    })
    .select("id")
    .single();
  if (insertErr) return { error: insertErr.message };
  if (!req) return { error: "Nepodařilo vytvořit žádost." };

  const startAt = new Date((apt as { start_at: string }).start_at);
  const dateStr = startAt.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
  const clientName = (profile as { display_name?: string } | null)?.display_name ?? "Klientka";

  const title = requestType === "delete"
    ? "Žádost o zrušení termínu"
    : "Žádost o úpravu termínu";
  const body = `${clientName} – termín ${dateStr}`;

  const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
  for (const admin of admins ?? []) {
    await supabase.from("notifications").insert({
      user_id: (admin as { id: string }).id,
      type: "appointment_change_request",
      title,
      body,
      meta: { request_id: (req as { id: string }).id, appointment_id: appointmentId, request_type: requestType },
    });
  }

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard/calendar/terms");
  return { error: null };
}

/** Admin: schválení žádosti (úprava → aplikovat změny, zrušení → uvolnit termín). */
export async function approveAppointmentChangeRequest(
  requestId: string,
  notificationId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Pouze pro admina." };

  const { data: req, error: fetchErr } = await supabase
    .from("appointment_change_requests")
    .select("id, appointment_id, request_type, payload, status")
    .eq("id", requestId)
    .single();
  if (fetchErr || !req) return { error: "Žádost nenalezena." };
  const r = req as { status: string; appointment_id: string; request_type: string; payload: { note?: string; change_reason?: string } | null };
  if (r.status !== "pending") return { error: "Žádost již byla vyřízena." };

  if (r.request_type === "delete") {
    const res = await releaseAppointment(r.appointment_id);
    if (res.error) return res;
  } else {
    const payload = r.payload ?? {};
    const { error: updateErr } = await supabase
      .from("appointments")
      .update({ note: (payload.note ?? "").trim() || null })
      .eq("id", r.appointment_id);
    if (updateErr) return { error: updateErr.message };
  }

  await supabase
    .from("appointment_change_requests")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq("id", requestId);
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/terms");
  return { error: null };
}

/** Admin: odmítnutí žádosti. */
export async function rejectAppointmentChangeRequest(
  requestId: string,
  notificationId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Pouze pro admina." };

  const { data: req } = await supabase
    .from("appointment_change_requests")
    .select("id, status")
    .eq("id", requestId)
    .single();
  if (!req || (req as { status: string }).status !== "pending") {
    return { error: "Žádost nenalezena nebo již vyřízena." };
  }

  await supabase
    .from("appointment_change_requests")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq("id", requestId);
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard/calendar/terms");
  return { error: null };
}
