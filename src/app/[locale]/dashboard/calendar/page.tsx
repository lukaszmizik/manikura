import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarKeyedContent } from "@/components/calendar/CalendarKeyedContent";
import { SALON_INFO_ID } from "@/lib/salon";

export const dynamic = "force-dynamic";

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DD z data v lokálním čase (aby pondělí zůstal pondělí, ne UTC neděle). */
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Týden začíná vždy pondělím. Vrátí pondělí týdne; neděle (getDay=0) = 7. den, odečteme 6. */
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = neděle, 1 = pondělí, …, 6 = sobota
  const daysToSubtract = day === 0 ? 6 : day - 1; // neděle = 6 dní zpět, pondělí = 0, úterý = 1, …
  date.setDate(date.getDate() - daysToSubtract);
  date.setHours(0, 0, 0, 0);
  return date;
}

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ week?: string }>;
};

export default async function CalendarPage({ params, searchParams }: PageProps) {
  noStore();
  const { locale } = await params;
  const resolvedSearch = await searchParams;
  const weekParam = resolvedSearch.week;

  const t = await getTranslations({ locale, namespace: "calendar" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const roleRaw = profile?.role != null ? String(profile.role).toLowerCase().trim() : null;
  const roleFromDb = (roleRaw === "admin" ? "admin" : "client") as "admin" | "client";

  const adminEmailsEnv =
    typeof process !== "undefined" && process.env?.NEXT_PUBLIC_ADMIN_EMAILS
      ? process.env.NEXT_PUBLIC_ADMIN_EMAILS
      : "";
  const adminEmails = adminEmailsEnv
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const emailLower = user?.email?.toLowerCase() ?? "";
  const isAdmin =
    adminEmails.length > 0 && emailLower && adminEmails.includes(emailLower)
      ? true
      : roleFromDb === "admin";
  const weekStart = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
    ? getMonday(new Date(weekParam + "T12:00:00"))
    : getMonday(new Date());
  const weekStartKey = toLocalDateKey(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const localeStr = locale === "ru" ? "ru-RU" : "cs-CZ";

  if (isAdmin) {
    const [
      { data: appointmentsData },
      { data: clientsData },
      { data: salonRow },
      { data: restrictionsData },
    ] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, client_id, guest_client_name, start_at, end_at, status, is_last_minute, client_change_reason, client_change_requested_at, client:profiles!client_id(display_name)")
        .in("status", ["pending", "confirmed", "completed"])
        .gte("start_at", weekStart.toISOString())
        .lte("start_at", weekEnd.toISOString())
        .order("start_at", { ascending: true }),
      supabase.from("profiles").select("id, display_name").eq("role", "client").order("display_name"),
      supabase
        .from("salon_info")
        .select("calendar_display_start, calendar_display_end, default_slot_minutes")
        .eq("id", SALON_INFO_ID)
        .single(),
      supabase
        .from("availability_restrictions")
        .select("restriction_date, restriction_type")
        .gte("restriction_date", weekStartKey)
        .lte("restriction_date", toLocalDateKey(weekEnd)),
    ]);

    const displayStart = (salonRow as { calendar_display_start?: string } | null)?.calendar_display_start?.slice(0, 5) ?? "08:00";
    const displayEnd = (salonRow as { calendar_display_end?: string } | null)?.calendar_display_end?.slice(0, 5) ?? "20:00";
    const defaultSlotMinutes = (salonRow as { default_slot_minutes?: number | null } | null)?.default_slot_minutes ?? 120;

    const sickDateKeys: string[] = (restrictionsData ?? [])
      .map((r: { restriction_date: string }) => r.restriction_date);

    const appointmentsList = (appointmentsData ?? []) as unknown as Array<{
      id: string;
      client_id: string | null;
      guest_client_name?: string | null;
      start_at: string;
      end_at: string;
      status: string;
      is_last_minute?: boolean;
      client_change_reason?: string | null;
      client_change_requested_at?: string | null;
      client?: { display_name: string | null } | null;
    }>;
    const clients = (clientsData ?? []).map((r) => ({
      id: r.id,
      display_name: r.display_name ?? null,
    }));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100">{t("title")}</h2>
          <Link
            href="/dashboard/calendar/settings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-50 dark:border-primary-700 dark:text-primary-200 dark:hover:bg-primary-800/50"
          >
            {t("settingsLinkLabel")}
          </Link>
        </div>
        <CalendarKeyedContent
          weekStart={weekStartKey}
          appointments={appointmentsList}
          clients={clients}
          localeStr={localeStr}
          displayStart={displayStart}
          displayEnd={displayEnd}
          sickDateKeys={sickDateKeys}
          defaultSlotMinutes={defaultSlotMinutes}
        />
      </div>
    );
  }

  // Klientka: seznamový pohled s přepínáním týdnů (pondělí–neděle)
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDays.push(d);
  }
  const prevWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevWeekKeyStr = toLocalDateKey(prevWeekStart);
  const nextMondayDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);
  const nextWeekKeyStr = toLocalDateKey(nextMondayDate);
  const weekEndKey = toLocalDateKey(weekEnd);
  const selectQuery = "id, start_at, end_at, status, is_last_minute";
  const [
    { data: appointmentsData },
    { data: volnoData },
    { data: restrictionsData },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(selectQuery)
      .eq("client_id", user!.id)
      .in("status", ["pending", "confirmed", "cancelled"])
      .gte("start_at", weekStart.toISOString())
      .lte("start_at", weekEnd.toISOString())
      .order("start_at", { ascending: true }),
    supabase
      .from("appointments")
      .select(selectQuery)
      .is("client_id", null)
      .in("status", ["pending", "confirmed"])
      .gte("start_at", weekStart.toISOString())
      .lte("start_at", weekEnd.toISOString())
      .order("start_at", { ascending: true }),
    supabase
      .from("availability_restrictions")
      .select("restriction_date, restriction_type, note")
      .gte("restriction_date", weekStartKey)
      .lte("restriction_date", weekEndKey),
  ]);

  const restrictionsByDate: Record<string, { restriction_type: string; note: string | null }> = {};
  (restrictionsData ?? []).forEach((r: { restriction_date: string; restriction_type: string; note: string | null }) => {
    restrictionsByDate[r.restriction_date] = { restriction_type: r.restriction_type, note: r.note };
  });

  type AptRow = {
    id: string;
    start_at: string;
    end_at: string;
    status: string;
    is_last_minute: boolean;
    isVolno?: boolean;
  };

  const appointmentsList: AptRow[] = (appointmentsData ?? []).map((a) => ({ ...a, isVolno: false }));
  const volnoList: AptRow[] = (volnoData ?? []).map((a) => ({ ...a, isVolno: true }));
  const allForWeek = [...appointmentsList, ...volnoList].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );

  const aptIds = appointmentsList.map((a) => a.id);
  const { data: changeRequestsData } = await supabase
    .from("appointment_change_requests")
    .select("appointment_id, status")
    .eq("client_id", user!.id)
    .eq("request_type", "delete")
    .in("appointment_id", aptIds.length ? aptIds : ["00000000-0000-0000-0000-000000000000"]);

  const deleteRequestByAptId: Record<string, { status: "pending" | "approved" }> = {};
  (changeRequestsData ?? []).forEach((r: { appointment_id: string; status: string }) => {
    if (r.status === "pending" || r.status === "approved") {
      deleteRequestByAptId[r.appointment_id] = { status: r.status as "pending" | "approved" };
    }
  });

  const byDate: Record<string, AptRow[]> = {};
  weekDays.forEach((d) => {
    byDate[toLocalDateKey(d)] = [];
  });
  allForWeek.forEach((apt) => {
    const key = toLocalDateKey(new Date(apt.start_at));
    if (byDate[key]) byDate[key].push(apt);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100">{t("title")}</h2>
      </div>
      <p className="text-sm text-primary-600 dark:text-primary-400">{t("clientDesc")}</p>
      <section aria-label={t("weekView")}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Link
              href={{ pathname: "/dashboard/calendar", query: { week: prevWeekKeyStr } }}
              className="p-2 rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50 dark:border-primary-700 dark:hover:bg-primary-800/50"
              aria-label={t("prevWeek")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <span className="text-sm font-medium text-primary-800 dark:text-primary-100 min-w-[180px] text-center">
              {weekDays[0].toLocaleDateString(localeStr, { month: "long", year: "numeric" })}
              {" – "}
              {weekDays[0].getDate()}.{weekDays[0].getMonth() + 1}. – {weekDays[6].getDate()}.{weekDays[6].getMonth() + 1}.
            </span>
            <Link
              href={{ pathname: "/dashboard/calendar", query: { week: nextWeekKeyStr } }}
              className="p-2 rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50 dark:border-primary-700 dark:hover:bg-primary-800/50"
              aria-label={t("nextWeek")}
            >
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
        <div className="space-y-2">
          {weekDays.map((day) => {
            const key = toLocalDateKey(day);
            const restriction = restrictionsByDate[key];
            const dayAppointments = byDate[key] ?? [];
            const dayLabel = day.toLocaleDateString(localeStr, {
              weekday: "short",
              day: "numeric",
              month: "short",
            });
            const isToday = key === toLocalDateKey(new Date());
            const restrictionLabel =
              restriction?.restriction_type === "sick"
                ? t("restrictionSick")
                : restriction?.restriction_type === "vacation"
                  ? t("restrictionVacation")
                  : restriction
                    ? t("restrictionOther")
                    : null;

            if (restriction) {
              return (
                <div
                  key={key}
                  className="flex flex-col gap-1 rounded-xl border border-primary-200 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/20 p-3 opacity-75 cursor-default"
                  aria-disabled="true"
                >
                  <span className="font-medium text-primary-500 dark:text-primary-400 shrink-0">{dayLabel}</span>
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                      {restrictionLabel}
                    </span>
                    {restriction.note?.trim() && (
                      <span className="text-xs text-primary-500 dark:text-primary-500">
                        – {restriction.note.trim()}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={key}
                href={{ pathname: "/dashboard/calendar/book", query: { date: key } }}
                className={`flex items-center justify-between gap-2 rounded-xl border p-3 transition-colors ${
                  isToday
                    ? "border-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50"
                    : "border-primary-100 dark:border-primary-800 bg-white dark:bg-primary-950 hover:bg-primary-50 dark:hover:bg-primary-900/30"
                }`}
              >
                <span className="font-medium text-primary-800 dark:text-primary-100 shrink-0">{dayLabel}</span>
                <div className="flex flex-wrap gap-1.5 justify-end min-w-0">
                  {dayAppointments.length === 0 ? (
                    <span className="text-xs text-primary-500">{t("noSlots")}</span>
                  ) : (
                    dayAppointments.map((apt) => {
                      if (apt.isVolno) {
                        const timeStr = new Date(apt.start_at).toLocaleTimeString(localeStr, {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        return (
                          <span
                            key={apt.id}
                            className="bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 text-xs font-medium px-2 py-0.5 rounded"
                          >
                            {timeStr}
                          </span>
                        );
                      }
                      const changeRequest = deleteRequestByAptId[apt.id] ?? null;
                      const isReleased = changeRequest?.status === "approved" || apt.status === "cancelled";
                      const isPendingDelete = changeRequest?.status === "pending";
                      const timeStr = new Date(apt.start_at).toLocaleTimeString(localeStr, {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const badgeClass = isReleased
                        ? "bg-primary-100 dark:bg-primary-800/50 text-primary-500 dark:text-primary-400 text-xs font-medium px-2 py-0.5 rounded"
                        : isPendingDelete
                          ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs font-medium px-2 py-0.5 rounded"
                          : apt.status === "confirmed"
                            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-xs font-medium px-2 py-0.5 rounded"
                            : apt.is_last_minute
                              ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium px-2 py-0.5 rounded"
                              : "bg-primary-100 dark:bg-primary-800/50 text-primary-700 dark:text-primary-300 text-xs font-medium px-2 py-0.5 rounded";
                      return (
                        <span key={apt.id} className={badgeClass}>
                          {timeStr}
                        </span>
                      );
                    })
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
