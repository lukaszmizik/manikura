"use server";

import { createClient, createServerAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { SLOT_TAKEN_ERROR } from "@/lib/calendar";
import { SALON_INFO_ID } from "@/lib/salon";

function isAppAdmin(profileRole: string | null | undefined, userEmail: string | undefined): boolean {
  if (profileRole === "admin") return true;
  const env =
    typeof process !== "undefined" && process.env?.NEXT_PUBLIC_ADMIN_EMAILS
      ? process.env.NEXT_PUBLIC_ADMIN_EMAILS
      : "";
  const emails = env.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !!userEmail && emails.includes(userEmail.toLowerCase());
}

function isOverlapError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "23P01" ||
    /exclusion|overlap|appointments_no_overlap/i.test(error.message ?? "")
  );
}

function generateClaimCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = new Uint8Array(6);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  }
  for (let i = 0; i < 6; i++) code += chars[bytes[i]! % chars.length];
  return code;
}

export async function saveWorkingHours(formData: FormData) {
  const supabase = await createClient();
  for (let day = 0; day <= 6; day++) {
    const active = formData.get(`day_${day}_active`) === "on";
    const start = (formData.get(`day_${day}_start`) as string) || "09:00";
    const end = (formData.get(`day_${day}_end`) as string) || "17:00";
    let startTime = active ? `${start}:00`.slice(0, 8) : "00:00:00";
    let endTime = active ? `${end}:00`.slice(0, 8) : "00:00:00";
    if (active && startTime >= endTime) {
      startTime = "00:00:00";
      endTime = "00:00:00";
    }
    const { error } = await supabase.from("working_hours").upsert(
      { day_of_week: day, start_time: startTime, end_time: endTime },
      { onConflict: "day_of_week" }
    );
    if (error) return { error: error.message };
  }
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/settings");
  revalidatePath("/dashboard/calendar/book");
  return { error: null };
}

export async function addRestriction(formData: FormData) {
  const supabase = await createClient();
  const date = formData.get("date") as string;
  const type = (formData.get("type") as "sick" | "vacation" | "other") || "other";
  const note = (formData.get("note") as string) || null;
  const { data: existing, error: existingErr } = await supabase
    .from("availability_restrictions")
    .select("restriction_type")
    .eq("restriction_date", date)
    .maybeSingle();
  if (existingErr) return { error: existingErr.message };
  if (existing) {
    const t =
      (existing as { restriction_type?: string }).restriction_type === "sick"
        ? "nemoc"
        : (existing as { restriction_type?: string }).restriction_type === "vacation"
          ? "dovolená"
          : "jiné omezení";
    return { error: `Pro tento den už je nastaveno omezení (${t}). Pro úpravu nejdřív smažte stávající.` };
  }
  const { error } = await supabase.from("availability_restrictions").insert({
    restriction_date: date,
    restriction_type: type,
    note: (note && note.trim()) || null,
  });
  if (error) return { error: error.message };
  // Poslat informaci o omezení klientkám – jako broadcast + notifikace
  const adminClient = createServerAdminClient();
  const { data: clients } = await adminClient
    .from("profiles")
    .select("id")
    .eq("role", "client");
  const dateObj = new Date(`${date}T00:00:00`);
  const dateStr = dateObj.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  const typeLabel =
    type === "sick" ? "Nemoc" : type === "vacation" ? "Dovolená" : "Jiné omezení";
  const bodyLines = [
    `Datum: ${dateStr}`,
    `Typ: ${typeLabel}`,
    note && note.trim() ? `Poznámka: ${note.trim()}` : null,
  ].filter(Boolean) as string[];

  // Zpráva v sekci Zprávy (admin_broadcasts)
  await adminClient.from("admin_broadcasts").insert({
    body: bodyLines.join("\n"),
    show_from: new Date().toISOString(),
    show_until: null,
    created_by: null,
  });

  // Individuální notifikace pro každou klientku
  for (const c of clients ?? []) {
    await adminClient.from("notifications").insert({
      user_id: (c as { id: string }).id,
      type: "calendar_restriction",
      title: "Omezení v kalendáři",
      body: bodyLines.join("\n"),
      meta: { restriction_date: date, restriction_type: type },
    });
  }
  revalidatePath("/dashboard/calendar/settings");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/book");
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard/messages");
  return { error: null };
}

export async function deleteRestriction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("availability_restrictions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/calendar/settings");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/book");
  return { error: null };
}

/** Admin: uložit rozsah zobrazení kalendáře (řádky mřížky). */
export async function updateCalendarDisplayRange(
  displayStart: string,
  displayEnd: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAppAdmin(profile?.role ?? null, user.email)) return { error: "Pouze pro admina." };
  const startTime = `${displayStart.replace(/^(\d{1,2}):(\d{2})$/, "$1:$2:00")}`.slice(0, 8);
  const endTime = `${displayEnd.replace(/^(\d{1,2}):(\d{2})$/, "$1:$2:00")}`.slice(0, 8);
  if (startTime >= endTime) return { error: "Čas konce musí být po čase začátku." };
  const { error } = await supabase
    .from("salon_info")
    .update({
      calendar_display_start: startTime,
      calendar_display_end: endTime,
    })
    .eq("id", SALON_INFO_ID);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/calendar/settings");
  revalidatePath("/dashboard/calendar");
  return { error: null };
}

const ALLOWED_SLOT_MINUTES = [30, 60, 90, 120] as const;

/** Admin: uložit výchozí délku slotu (minuty). */
export async function updateDefaultSlotMinutes(minutes: number): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAppAdmin(profile?.role ?? null, user.email)) return { error: "Pouze pro admina." };
  const value = ALLOWED_SLOT_MINUTES.includes(minutes as (typeof ALLOWED_SLOT_MINUTES)[number])
    ? minutes
    : 120;
  const { error } = await supabase
    .from("salon_info")
    .update({ default_slot_minutes: value })
    .eq("id", SALON_INFO_ID);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/calendar/settings");
  revalidatePath("/dashboard/calendar");
  return { error: null };
}

/** Admin: zapnout/vypnout automatické schvalování termínů klientkám (bez výstrahy). */
export async function updateAutoApproveBookings(checked: boolean): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAppAdmin(profile?.role ?? null, user.email)) return { error: "Pouze pro admina." };
  const { error } = await supabase
    .from("salon_info")
    .update({ auto_approve_bookings: !!checked })
    .eq("id", SALON_INFO_ID);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/calendar/settings");
  revalidatePath("/dashboard/calendar");
  return { error: null };
}

export async function addLastMinuteOffer(formData: FormData) {
  const supabase = await createClient();
  const date = formData.get("date") as string;
  const start = formData.get("start") as string;
  const end = formData.get("end") as string;
  const price = Number(formData.get("price"));
  if (!date || !start || !end || isNaN(price) || price <= 0) return { error: "Neplatné údaje" };
  const { error } = await supabase.from("last_minute_offers").insert({
    offer_date: date,
    start_time: `${start}:00`.slice(0, 8),
    end_time: `${end}:00`.slice(0, 8),
    price_czk: price,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/book");
  return { error: null };
}

export async function deleteLastMinuteOffer(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("last_minute_offers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/book");
  return { error: null };
}

export async function createBooking(clientId: string, date: string, startTime: string, endTime: string, isLastMinute: boolean, lastMinutePrice: number | null) {
  const supabase = await createClient();
  const startAt = new Date(`${date}T${startTime}`);
  const endAt = new Date(`${date}T${endTime}`);
  const { error } = await supabase.from("appointments").insert({
    client_id: clientId,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    status: "pending",
    is_last_minute: isLastMinute,
    last_minute_price: lastMinutePrice,
  });
  if (error) {
    return { error: isOverlapError(error) ? SLOT_TAKEN_ERROR : error.message };
  }
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/book");
  revalidatePath("/dashboard/calendar/terms");
  return { error: null };
}

/** Veřejná rezervace bez registrace – vytvoří (nebo najde) klientský účet podle e-mailu, uloží rezervaci a klientovi odešleme magic link. */
export async function createGuestBookingWithMagicLink(payload: {
  email: string;
  displayName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  isLastMinute: boolean;
  lastMinutePrice: number | null;
  appointmentId: string | null;
}): Promise<{ error: string | null }> {
  const email = (payload.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Zadejte platný e-mail." };
  }

  const adminClient = createServerAdminClient();

  // Najít existující klientský profil podle e-mailu, případně vytvořit nový účet.
  const { data: profiles, error: profileErr } = await adminClient
    .from("profiles")
    .select("id, email, role, display_name")
    .eq("email", email)
    .eq("role", "client")
    .limit(1);
  if (profileErr) return { error: profileErr.message };

  let clientId: string;

  if (profiles && profiles.length > 0) {
    clientId = (profiles[0] as { id: string }).id;
  } else {
    const displayNameTrimmed = (payload.displayName ?? "").trim();
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: {
        display_name: displayNameTrimmed || null,
        role: "client",
      },
    });
    if (createError || !newUser.user) {
      return { error: createError?.message ?? "Vytvoření účtu se nezdařilo." };
    }
    clientId = newUser.user.id;
    const profileDisplayName =
      displayNameTrimmed ||
      (newUser.user.user_metadata as { display_name?: string } | null)?.display_name ||
      email.split("@")[0] ||
      null;
    const { error: upsertErr } = await adminClient.from("profiles").upsert(
      {
        id: clientId,
        email,
        display_name: profileDisplayName,
        role: "client",
      },
      { onConflict: "id" }
    );
    if (upsertErr) return { error: upsertErr.message };
  }

  // Pokud existuje volný slot (appointmentId), přiřadíme klientku k tomuto slotu.
  if (payload.appointmentId) {
    const { data: apt, error: fetchErr } = await adminClient
      .from("appointments")
      .select("id, client_id, guest_client_name, start_at, end_at, status")
      .eq("id", payload.appointmentId)
      .single();
    if (fetchErr || !apt) return { error: SLOT_TAKEN_ERROR };
    if ((apt as { client_id: string | null }).client_id != null) {
      return { error: SLOT_TAKEN_ERROR };
    }
    const guestName = (apt as { guest_client_name?: string | null }).guest_client_name;
    if (guestName != null && guestName.trim() !== "") {
      return { error: SLOT_TAKEN_ERROR };
    }

    // Stejná logika auto-approve jako u assignClientToFreeSlot, ale bez požadavku na přihlášeného uživatele.
    let autoApproveForClient = false;
    const [{ data: salonRow }, { data: clientWarnings }] = await Promise.all([
      adminClient.from("salon_info").select("auto_approve_bookings").eq("id", SALON_INFO_ID).single(),
      adminClient.from("client_warnings").select("id").eq("client_id", clientId).limit(1),
    ]);
    const autoApprove = (salonRow as { auto_approve_bookings?: boolean } | null)?.auto_approve_bookings === true;
    const hasWarning = Array.isArray(clientWarnings) && clientWarnings.length > 0;
    autoApproveForClient = autoApprove && !hasWarning;

    const updates: { client_id: string; status?: string; updated_at: string } = {
      client_id: clientId,
      updated_at: new Date().toISOString(),
    };
    if (autoApproveForClient) {
      updates.status = "confirmed";
    }

    const { error: updateErr } = await adminClient
      .from("appointments")
      .update(updates)
      .eq("id", payload.appointmentId);
    if (updateErr) {
      return { error: isOverlapError(updateErr) ? SLOT_TAKEN_ERROR : updateErr.message };
    }

    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/calendar/book");
    revalidatePath("/dashboard/calendar/terms");

    return { error: null };
  }

  // Jinak vytvoříme novou rezervaci v daném čase.
  const startAt = new Date(`${payload.date}T${payload.startTime}`);
  const endAt = new Date(`${payload.date}T${payload.endTime}`);
  const { error } = await adminClient.from("appointments").insert({
    client_id: clientId,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    status: "pending",
    is_last_minute: payload.isLastMinute,
    last_minute_price: payload.lastMinutePrice,
  });
  if (error) {
    return { error: isOverlapError(error) ? SLOT_TAKEN_ERROR : error.message };
  }

  // Revalidace kalendáře pro přihlášené i rezervace bez registrace.
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/book");
  revalidatePath("/dashboard/calendar/terms");

  return { error: null };
}

/** Klientka se přiřadí k volnému slotu (appointment s client_id = null a bez guest_client_name). Při zapnutém auto_approve a bez výstrahy se termín uloží rovnou jako potvrzený. */
export async function claimSlot(appointmentId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };

  const { data: apt, error: fetchErr } = await supabase
    .from("appointments")
    .select("id, client_id, guest_client_name")
    .eq("id", appointmentId)
    .single();
  if (fetchErr || !apt) return { error: SLOT_TAKEN_ERROR };
  if ((apt as { client_id: string | null }).client_id != null) return { error: SLOT_TAKEN_ERROR };
  const guestName = (apt as { guest_client_name?: string | null }).guest_client_name;
  if (guestName != null && guestName.trim() !== "") {
    return { error: SLOT_TAKEN_ERROR };
  }

  const [{ data: salon }, { data: warnings }] = await Promise.all([
    supabase.from("salon_info").select("auto_approve_bookings").eq("id", SALON_INFO_ID).single(),
    supabase.from("client_warnings").select("id").eq("client_id", user.id).limit(1),
  ]);
  const autoApprove = (salon as { auto_approve_bookings?: boolean } | null)?.auto_approve_bookings === true;
  const hasWarning = Array.isArray(warnings) && warnings.length > 0;
  const setConfirmed = autoApprove && !hasWarning;

  const updatePayload: { client_id: string; updated_at: string; status?: string } = {
    client_id: user.id,
    updated_at: new Date().toISOString(),
  };
  if (setConfirmed) updatePayload.status = "confirmed";

  const { data, error } = await supabase
    .from("appointments")
    .update(updatePayload)
    .eq("id", appointmentId)
    .is("client_id", null)
    .select("id, start_at")
    .single();
  if (error) return { error: error.message };
  if (!data) return { error: SLOT_TAKEN_ERROR };

  const startAt = (data as { start_at: string }).start_at;
  const dateStr = startAt
    ? new Date(startAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";
  await supabase.from("notifications").insert({
    user_id: user.id,
    type: "appointment_to_confirm",
    title: setConfirmed ? "Termín byl potvrzen" : "Nový termín k potvrzení",
    body: setConfirmed
      ? `Váš termín ${dateStr} byl rezervován a potvrzen.`
      : `Máte nový termín ${dateStr}. Prosím potvrďte nebo odmítněte v Kalendáři nebo v upozorněních.`,
    meta: { appointment_id: appointmentId },
  });

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/book");
  revalidatePath("/dashboard/calendar/terms");
  return { error: null };
}

/** Admin: vytvoření rezervace. Klientka ze seznamu, nebo neregistrovaná (jméno); volitelně uložit jméno jako profil; last minute. */
export async function createAppointmentByAdmin(
  payload: {
    clientId: string | null;
    guestClientName: string | null;
    saveGuest: boolean;
    startAtIso: string;
    endAtIso: string;
    note: string | null;
    isLastMinute: boolean;
    ignoreWarnings?: boolean;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAppAdmin(profile?.role ?? null, user.email)) return { error: "Pouze pro admina." };

  const { clientId, guestClientName, saveGuest, startAtIso, endAtIso, note, isLastMinute, ignoreWarnings } = payload;
  const adminClient = createServerAdminClient();

  let resolvedClientId: string | null = clientId;
  const guestNameTrimmed = guestClientName?.trim() || null;

  if (!resolvedClientId && guestNameTrimmed) {
    if (saveGuest) {
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: `guest-${crypto.randomUUID()}@manikura.local`,
        password: crypto.randomUUID().replace(/-/g, "").slice(0, 20),
        email_confirm: true,
        user_metadata: { display_name: guestNameTrimmed, role: "client" },
      });
      if (createError || !newUser.user) {
        return { error: createError?.message ?? "Vytvoření klientky se nezdařilo." };
      }
      resolvedClientId = newUser.user.id;
      const claimCode = generateClaimCode();
      await adminClient.from("guest_claim_codes").insert({ user_id: resolvedClientId, code: claimCode });
    }
  }

  if (!resolvedClientId && !guestNameTrimmed) {
    // Povoleno: volný slot bez přiřazené klientky (klientky se k němu přiřadí při rezervaci).
  }

  let autoApproveForClient = false;
  let hasWarning = false;
  if (resolvedClientId) {
    const [{ data: salonRow }, { data: clientWarnings }] = await Promise.all([
      adminClient.from("salon_info").select("auto_approve_bookings").eq("id", SALON_INFO_ID).single(),
      adminClient
        .from("client_warnings")
        .select("warning_type, reason")
        .eq("client_id", resolvedClientId),
    ]);
    const autoApprove = (salonRow as { auto_approve_bookings?: boolean } | null)?.auto_approve_bookings === true;
    const warningsArr = (clientWarnings ?? []) as { warning_type: string; reason: string | null }[];
    hasWarning = warningsArr.length > 0;

    // Pokud má klientka výstrahu a admin ji chce ručně naplánovat, nejprve ho na to upozorníme.
    if (hasWarning && !ignoreWarnings) {
      const summary = warningsArr
        .map((w) => (w.reason && w.reason.trim()) || w.warning_type || "výstraha")
        .join("; ");
      // Speciální prefix pro klientskou logiku – zobrazí se potvrzovací dialog.
      return { error: `CLIENT_WARNING:${summary}` };
    }

    autoApproveForClient = autoApprove && !hasWarning;
  }

  const insertPayload: {
    client_id: string | null;
    guest_client_name: string | null;
    start_at: string;
    end_at: string;
    status: string;
    note: string | null;
    is_last_minute: boolean;
    last_minute_price?: number | null;
  } = {
    client_id: resolvedClientId,
    guest_client_name: resolvedClientId ? null : guestNameTrimmed,
    start_at: startAtIso,
    end_at: endAtIso,
    status:
      resolvedClientId && (autoApproveForClient || (hasWarning && ignoreWarnings))
        ? "confirmed"
        : "pending",
    note: (note && note.trim()) || null,
    is_last_minute: isLastMinute,
  };
  if (isLastMinute) {
    const { data: salon } = await adminClient
      .from("salon_info")
      .select("default_price_czk, last_minute_discount_percent")
      .eq("id", SALON_INFO_ID)
      .single();
    const base = (salon as { default_price_czk?: number | null } | null)?.default_price_czk;
    const discount = (salon as { last_minute_discount_percent?: number | null } | null)?.last_minute_discount_percent;
    if (base != null && base > 0 && discount != null && discount >= 0 && discount <= 100) {
      insertPayload.last_minute_price = Math.round(base * (1 - discount / 100) * 100) / 100;
    } else {
      insertPayload.last_minute_price = null;
    }
  }

  const { data: insertedRow, error } = await adminClient.from("appointments").insert(insertPayload).select("id").single();
  if (error) {
    return { error: isOverlapError(error) ? SLOT_TAKEN_ERROR : error.message };
  }
  if (resolvedClientId && insertedRow?.id) {
    const startAt = new Date(startAtIso);
    const dateStr = startAt.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const isConfirmed = insertPayload.status === "confirmed";
    await adminClient.from("notifications").insert({
      user_id: resolvedClientId,
      type: "appointment_to_confirm",
      title: isConfirmed ? "Termín byl rezervován" : "Nový termín k potvrzení",
      body: isConfirmed
        ? `Váš termín ${dateStr} byl rezervován a potvrzen.`
        : `Máte nový termín ${dateStr}. Prosím potvrďte nebo odmítněte v Kalendáři nebo v upozorněních.`,
      meta: { appointment_id: insertedRow.id },
    });
  }
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/book");
  revalidatePath("/dashboard/notifications");
  return { error: null };
}

/** Klientka: žádost o termín (čas + poznámka). Manikérka pak schválí nebo odmítne. */
export async function createQuickBookingRequest(payload: {
  requestedDate: string;
  requestedStartTime: string;
  requestedEndTime: string;
  startAtIso: string;
  endAtIso: string;
  note: string | null;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "admin") return { error: "Pouze pro klientky." };

  const { requestedDate, requestedStartTime, requestedEndTime, startAtIso, endAtIso, note } = payload;
  const start = new Date(startAtIso);
  const end = new Date(endAtIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return { error: "Neplatný časový rozsah." };
  }
  const noteTrimmed = note?.trim() || null;

  const { error } = await supabase.from("quick_booking_requests").insert({
    client_id: user.id,
    requested_date: requestedDate,
    requested_start_time: requestedStartTime.slice(0, 8),
    requested_end_time: requestedEndTime.slice(0, 8),
    requested_start_at: startAtIso,
    requested_end_at: endAtIso,
    note: noteTrimmed,
    status: "pending",
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/day");
  revalidatePath("/dashboard/calendar/terms");
  return { error: null };
}

/** Admin: schválit žádost o termín – vytvoří appointment a notifikuje klientku. */
export async function approveQuickBookingRequest(requestId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAppAdmin(profile?.role ?? null, user.email)) return { error: "Pouze pro admina." };

  const { data: req, error: fetchErr } = await supabase
    .from("quick_booking_requests")
    .select("id, client_id, requested_start_at, requested_end_at, note, status")
    .eq("id", requestId)
    .single();
  if (fetchErr || !req) return { error: "Žádost nenalezena." };
  const row = req as { client_id: string; requested_start_at: string; requested_end_at: string; note: string | null; status: string };
  if (row.status !== "pending") return { error: "Žádost již byla vyřízena." };

  const adminClient = createServerAdminClient();
  const { data: inserted, error: insertErr } = await adminClient
    .from("appointments")
    .insert({
      client_id: row.client_id,
      start_at: row.requested_start_at,
      end_at: row.requested_end_at,
      status: "confirmed",
      note: row.note,
      is_last_minute: false,
    })
    .select("id")
    .single();
  if (insertErr) {
    return { error: isOverlapError(insertErr) ? SLOT_TAKEN_ERROR : insertErr.message };
  }
  const appointmentId = (inserted as { id: string })?.id;
  if (!appointmentId) return { error: "Vytvoření termínu se nezdařilo." };

  const { error: updateErr } = await adminClient
    .from("quick_booking_requests")
    .update({
      status: "approved",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
      appointment_id: appointmentId,
    })
    .eq("id", requestId);
  if (updateErr) return { error: updateErr.message };

  const startAt = new Date(row.requested_start_at);
  const dateStr = startAt.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  await adminClient.from("notifications").insert({
    user_id: row.client_id,
    type: "appointment_confirmed",
    title: "Žádost o termín schválena",
    body: `Vaše žádost o termín byla schválena: ${dateStr}. Termín je potvrzen.`,
    meta: { appointment_id: appointmentId },
  });

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/book");
  revalidatePath("/dashboard/calendar/terms");
  revalidatePath("/dashboard/calendar/requests");
  revalidatePath("/dashboard/notifications");
  return { error: null };
}

/** Admin: odmítnout žádost o termín. */
export async function rejectQuickBookingRequest(requestId: string, reason?: string | null): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAppAdmin(profile?.role ?? null, user.email)) return { error: "Pouze pro admina." };

  const { data: req, error: fetchErr } = await supabase
    .from("quick_booking_requests")
    .select("id, client_id, status")
    .eq("id", requestId)
    .single();
  if (fetchErr || !req) return { error: "Žádost nenalezena." };
  const row = req as { client_id: string; status: string };
  if (row.status !== "pending") return { error: "Žádost již byla vyřízena." };

  const adminClient = createServerAdminClient();
  const { error: updateErr } = await adminClient
    .from("quick_booking_requests")
    .update({
      status: "rejected",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", requestId);
  if (updateErr) return { error: updateErr.message };

  const reasonTrimmed = reason?.trim() || null;
  if (reasonTrimmed) {
    await adminClient.from("notifications").insert({
      user_id: row.client_id,
      type: "quick_booking_rejected",
      title: "Žádost o termín nebyla schválena",
      body: `Manikérka vaši žádost o termín odmítla s tímto zdůvodněním:\n${reasonTrimmed}`,
      meta: { quick_booking_request_id: requestId },
    });
  }

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/requests");
  revalidatePath("/dashboard/notifications");
  return { error: null };
}

/** Admin: změna času rezervace. */
export async function updateAppointmentTime(id: string, startAtIso: string, endAtIso: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAppAdmin(profile?.role ?? null, user.email)) return { error: "Pouze pro admina." };
  const adminClient = createServerAdminClient();
  const { error } = await adminClient
    .from("appointments")
    .update({ start_at: startAtIso, end_at: endAtIso, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    return { error: isOverlapError(error) ? SLOT_TAKEN_ERROR : error.message };
  }
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/book");
  revalidatePath("/dashboard/calendar/terms");
  return { error: null };
}

/** Admin: smazání rezervace. U potvrzeného termínu lze volitelně uvést zdůvodnění (termín se zruší a klientka dostane notifikaci). */
export async function deleteAppointment(id: string, reason?: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAppAdmin(profile?.role ?? null, user.email)) return { error: "Pouze pro admina." };

  const { data: apt } = await supabase
    .from("appointments")
    .select("id, status, client_id, start_at")
    .eq("id", id)
    .single();
  if (!apt) return { error: "Termín nenalezen." };

  const status = (apt as { status: string }).status;
  const adminClient = createServerAdminClient();

  if (status === "confirmed") {
    const reasonTrimmed = (reason ?? "").trim() || null;
    const now = new Date().toISOString();
    const { error: updateErr } = await adminClient
      .from("appointments")
      .update({
        status: "cancelled",
        cancelled_at: now,
        cancelled_reason: reasonTrimmed,
        cancelled_by_admin: true,
        client_change_reason: null,
        client_change_requested_at: null,
      })
      .eq("id", id);
    if (updateErr) return { error: updateErr.message };
    const clientId = (apt as { client_id: string | null }).client_id;
    const startAt = new Date((apt as { start_at: string }).start_at);
    const dateStr = startAt.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    if (clientId) {
      const body = reasonTrimmed
        ? `Váš potvrzený termín ${dateStr} byl zrušen. Zdůvodnění: ${reasonTrimmed}`
        : `Váš potvrzený termín ${dateStr} byl zrušen.`;
      await adminClient.from("notifications").insert({
        user_id: clientId,
        type: "appointment_rejected",
        title: "Termín byl zrušen",
        body,
        meta: { appointment_id: id },
      });
    }
  } else {
    const { error } = await adminClient.from("appointments").delete().eq("id", id);
    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/terms");
  revalidatePath("/dashboard/calendar/book");
  revalidatePath("/dashboard/notifications");
  return { error: null };
}

/** Admin: potvrzení návštěvy (pending → confirmed). */
export async function confirmAppointment(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAppAdmin(profile?.role ?? null, user.email)) return { error: "Pouze pro admina." };
  const adminClient = createServerAdminClient();
  const { error } = await adminClient
    .from("appointments")
    .update({
      status: "confirmed",
      client_change_reason: null,
      client_change_requested_at: null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/book");
  revalidatePath("/dashboard/calendar/terms");
  return { error: null };
}

/** Admin: přiřadit klientku k volnému slotu (appointment s client_id = null). */
export async function assignClientToFreeSlot(appointmentId: string, clientId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAppAdmin(profile?.role ?? null, user.email)) return { error: "Pouze pro admina." };

  const { data: apt, error: fetchErr } = await supabase
    .from("appointments")
    .select("id, client_id, start_at, end_at, status")
    .eq("id", appointmentId)
    .single();
  if (fetchErr || !apt) return { error: "Termín nenalezen." };
  if ((apt as { client_id: string | null }).client_id) {
    return { error: "K tomuto termínu je již přiřazena klientka." };
  }

  const adminClient = createServerAdminClient();

  let autoApproveForClient = false;
  const [{ data: salonRow }, { data: clientWarnings }] = await Promise.all([
    adminClient.from("salon_info").select("auto_approve_bookings").eq("id", SALON_INFO_ID).single(),
    adminClient.from("client_warnings").select("id").eq("client_id", clientId).limit(1),
  ]);
  const autoApprove = (salonRow as { auto_approve_bookings?: boolean } | null)?.auto_approve_bookings === true;
  const hasWarning = Array.isArray(clientWarnings) && clientWarnings.length > 0;
  autoApproveForClient = autoApprove && !hasWarning;

  const updates: { client_id: string; status?: string; updated_at: string } = {
    client_id: clientId,
    updated_at: new Date().toISOString(),
  };
  if (autoApproveForClient) {
    updates.status = "confirmed";
  }

  const { error: updateErr } = await adminClient
    .from("appointments")
    .update(updates)
    .eq("id", appointmentId);
  if (updateErr) {
    return { error: isOverlapError(updateErr) ? SLOT_TAKEN_ERROR : updateErr.message };
  }

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/book");
  revalidatePath("/dashboard/calendar/terms");
  return { error: null };
}

/** Klientka: potvrzení vlastního termínu (pending → confirmed). */
export async function clientConfirmAppointment(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: "confirmed",
      client_change_reason: null,
      client_change_requested_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("client_id", user.id)
    .eq("status", "pending")
    .select("id")
    .single();
  if (error) return { error: error.message };
  if (!data) return { error: "Termín nenalezen nebo již byl potvrzen / odmítnut." };
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/notifications");
  return { error: null };
}

/** Klientka: odmítnutí vlastního termínu (pending → cancelled). */
export async function clientRejectAppointment(id: string, reason: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const reasonTrimmed = reason.trim() || "Bez zdůvodnění.";
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_at: now,
      cancelled_reason: reasonTrimmed,
      client_change_reason: null,
      client_change_requested_at: null,
      updated_at: now,
    })
    .eq("id", id)
    .eq("client_id", user.id)
    .eq("status", "pending")
    .select("id")
    .single();
  if (error) return { error: error.message };
  if (!data) return { error: "Termín nenalezen nebo již byl potvrzen / odmítnut." };
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/notifications");
  return { error: null };
}

/** Klientka: požádat o zrušení termínu (zobrazí se manikérce k potvrzení a uvolnění místa). */
export async function clientRequestCancellation(appointmentId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("appointments")
    .update({
      cancellation_requested_at: now,
      updated_at: now,
    })
    .eq("id", appointmentId)
    .eq("client_id", user.id)
    .in("status", ["pending", "confirmed"])
    .is("cancellation_requested_at", null)
    .select("id")
    .single();
  if (error) return { error: error.message };
  if (!data) return { error: "Termín nenalezen nebo již jste o zrušení požádala." };
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/terms");
  return { error: null };
}

/** Klientka: smazat z DB vlastní již zrušený termín (manikérka už potvrdila), aby zmizel z výpisu. */
export async function clientDismissCancelledAppointment(appointmentId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data, error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId)
    .eq("client_id", user.id)
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Termín nelze odstranit." };
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/terms");
  return { error: null };
}

/** Admin: potvrdit žádost o zrušení a uvolnit místo (termín → cancelled, vytvoří volný slot). */
export async function adminConfirmCancellationAndRelease(appointmentId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAppAdmin(profile?.role ?? null, user.email)) return { error: "Pouze pro admina." };

  const { data: apt, error: fetchErr } = await supabase
    .from("appointments")
    .select("id, start_at, end_at, client_id, is_last_minute, last_minute_price, note")
    .eq("id", appointmentId)
    .not("cancellation_requested_at", "is", null)
    .is("cancellation_requested_read_at", null)
    .single();
  if (fetchErr || !apt) return { error: "Termín nenalezen nebo již byl zpracován." };

  const adminClient = createServerAdminClient();
  const now = new Date().toISOString();

  const { error: updateErr } = await adminClient
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_at: now,
      cancelled_reason: "Zrušeno na žádost klientky.",
      cancellation_requested_read_at: now,
      client_change_reason: null,
      client_change_requested_at: null,
    })
    .eq("id", appointmentId);
  if (updateErr) return { error: updateErr.message };

  const start_at = (apt as { start_at: string }).start_at;
  const end_at = (apt as { end_at: string }).end_at;
  const is_last_minute = (apt as { is_last_minute?: boolean }).is_last_minute ?? false;
  const last_minute_price = (apt as { last_minute_price?: number | null }).last_minute_price ?? null;
  const note = (apt as { note?: string | null }).note ?? null;

  const { error: insertErr } = await adminClient.from("appointments").insert({
    client_id: null,
    start_at,
    end_at,
    status: "pending",
    is_last_minute,
    last_minute_price,
    note,
  });
  if (insertErr) return { error: isOverlapError(insertErr) ? SLOT_TAKEN_ERROR : insertErr.message };

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/terms");
  revalidatePath("/dashboard/calendar/book");
  return { error: null };
}

/** Admin: uvolnění termínu (zrušení po žádosti klientky o změnu). */
export async function releaseAppointment(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAppAdmin(profile?.role ?? null, user.email)) return { error: "Pouze pro admina." };
  const adminClient = createServerAdminClient();
  const now = new Date().toISOString();
  const { error } = await adminClient
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_at: now,
      cancelled_reason: "Na žádost klientky – změna po potvrzení.",
      client_change_reason: null,
      client_change_requested_at: null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/book");
  revalidatePath("/dashboard/calendar/terms");
  return { error: null };
}

/** Admin: potvrzení rezervace klientky (pending → confirmed); notifikace klientce. */
export async function adminConfirmAppointment(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAppAdmin(profile?.role ?? null, user.email)) return { error: "Pouze pro admina." };

  const { data: apt } = await supabase
    .from("appointments")
    .select("id, client_id, start_at, status")
    .eq("id", id)
    .single();
  if (!apt) return { error: "Termín nenalezen." };
  if ((apt as { status: string }).status !== "pending") {
    return { error: "Lze potvrdit pouze termín čekající na potvrzení." };
  }

  const clientId = (apt as { client_id: string | null }).client_id;
  const adminClient = createServerAdminClient();
  const { error: updateErr } = await adminClient
    .from("appointments")
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (updateErr) return { error: updateErr.message };

  if (clientId) {
    const startAt = new Date((apt as { start_at: string }).start_at);
    const dateStr = startAt.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    await adminClient.from("notifications").insert({
      user_id: clientId,
      type: "appointment_confirmed",
      title: "Termín potvrzen",
      body: `Váš termín ${dateStr} byl potvrzen manikérkou.`,
      meta: { appointment_id: id },
    });
  }

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/book");
  revalidatePath("/dashboard/calendar/terms");
  revalidatePath("/dashboard/notifications");
  return { error: null };
}

/** Admin: odmítnutí termínu (pending) se zdůvodněním; notifikace klientce s textem odmítnutí. */
export async function rejectAppointment(id: string, reason: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAppAdmin(profile?.role ?? null, user.email)) return { error: "Pouze pro admina." };

  const { data: apt } = await supabase
    .from("appointments")
    .select("id, client_id, start_at, status")
    .eq("id", id)
    .single();
  if (!apt) return { error: "Termín nenalezen." };
  if ((apt as { status: string }).status !== "pending") {
    return { error: "Lze odmítnout pouze termín čekající na potvrzení." };
  }

  const clientId = (apt as { client_id: string | null }).client_id;
  const startAt = new Date((apt as { start_at: string }).start_at);
  const dateStr = startAt.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const reasonTrimmed = reason.trim() || "Bez zdůvodnění.";

  const adminClient = createServerAdminClient();
  const now = new Date().toISOString();
  const { error: updateErr } = await adminClient
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_at: now,
      cancelled_reason: reasonTrimmed,
      client_change_reason: null,
      client_change_requested_at: null,
    })
    .eq("id", id);
  if (updateErr) return { error: updateErr.message };

  if (clientId) {
    const body = `Termín ${dateStr} byl odmítnut. Zdůvodnění: ${reasonTrimmed}`;
    await adminClient.from("notifications").insert({
      user_id: clientId,
      type: "appointment_rejected",
      title: "Termín byl odmítnut",
      body,
      meta: { appointment_id: id },
    });
  }

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/book");
  revalidatePath("/dashboard/calendar/terms");
  revalidatePath("/dashboard/notifications");
  return { error: null };
}

/** Admin: obnovit zrušený termín z historie (vytvoří nový appointment se stejnými údaji). */
export async function restoreAppointmentFromHistory(cancelledAppointmentId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAppAdmin(profile?.role ?? null, user.email)) return { error: "Pouze pro admina." };

  const { data: apt } = await supabase
    .from("appointments")
    .select("id, client_id, guest_client_name, start_at, end_at, status, is_last_minute, last_minute_price, note")
    .eq("id", cancelledAppointmentId)
    .single();
  if (!apt) return { error: "Termín nenalezen." };
  if ((apt as { status: string }).status !== "cancelled") {
    return { error: "Lze obnovit pouze zrušený termín." };
  }

  const clientId = (apt as { client_id: string | null }).client_id;
  const guestClientName = (apt as { guest_client_name?: string | null }).guest_client_name;
  if (!clientId && !(guestClientName && guestClientName.trim())) {
    return { error: "U termínu chybí klientka." };
  }

  const adminClient = createServerAdminClient();
  const insertPayload = {
    client_id: clientId ?? null,
    guest_client_name: clientId ? null : (guestClientName?.trim() || null),
    start_at: (apt as { start_at: string }).start_at,
    end_at: (apt as { end_at: string }).end_at,
    status: "pending",
    is_last_minute: (apt as { is_last_minute: boolean }).is_last_minute ?? false,
    last_minute_price: (apt as { last_minute_price?: number | null }).last_minute_price ?? null,
    note: (apt as { note?: string | null }).note ?? null,
  };

  const { error } = await adminClient.from("appointments").insert(insertPayload);
  if (error) {
    if (isOverlapError(error)) {
      const { data: conflict } = await adminClient
        .from("appointments")
        .select("id, client_id, guest_client_name, client:profiles!client_id(display_name)")
        .neq("status", "cancelled")
        .lt("start_at", (apt as { end_at: string }).end_at)
        .gt("end_at", (apt as { start_at: string }).start_at)
        .limit(1)
        .single();
      let name = (conflict as { client?: { display_name: string | null } | null; guest_client_name?: string | null } | null)
        ?.client?.display_name?.trim()
        || (conflict as { guest_client_name?: string | null } | null)?.guest_client_name?.trim()
        || "jiná klientka";
      return { error: `Nelze obnovit, volné místo obsadila klientka ${name}.` };
    }
    return { error: error.message };
  }
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/terms");
  revalidatePath("/dashboard/calendar/history");
  return { error: null };
}

/** Klientka: úprava vlastního termínu (poznámka, popř. čas). U potvrzeného vyžaduje zdůvodnění. */
export async function updateAppointmentByClient(
  appointmentId: string,
  data: { note?: string | null; start_at?: string; end_at?: string; change_reason?: string | null }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };

  const { data: existing } = await supabase
    .from("appointments")
    .select("id, client_id, status")
    .eq("id", appointmentId)
    .single();
  if (!existing || (existing as { client_id: string }).client_id !== user.id) {
    return { error: "Termín nenalezen nebo nemáte oprávnění." };
  }

  const status = (existing as { status: string }).status;
  const isConfirmed = status === "confirmed";
  const hasChanges =
    data.note !== undefined || data.start_at !== undefined || data.end_at !== undefined;
  if (isConfirmed && hasChanges) {
    const reason = (data.change_reason ?? "").trim();
    if (!reason) return { error: "U potvrzené návštěvy je zdůvodnění změny povinné." };
  }

  const updates: Record<string, unknown> = {};
  if (data.note !== undefined) updates.note = data.note?.trim() || null;
  if (data.start_at !== undefined) updates.start_at = data.start_at;
  if (data.end_at !== undefined) updates.end_at = data.end_at;
  if (isConfirmed && hasChanges && data.change_reason !== undefined) {
    updates.client_change_reason = (data.change_reason ?? "").trim() || null;
    updates.client_change_requested_at = new Date().toISOString();
  }

  if (Object.keys(updates).length === 0) return { error: null };

  const { error } = await supabase.from("appointments").update(updates).eq("id", appointmentId).eq("client_id", user.id);
  if (error) {
    return { error: isOverlapError(error) ? SLOT_TAKEN_ERROR : error.message };
  }
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/book");
  revalidatePath("/dashboard/calendar/terms");
  return { error: null };
}
