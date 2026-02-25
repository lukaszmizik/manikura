import { createServerAdminClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getFreeSlotsForDate } from "@/lib/slots";
import { SALON_INFO_ID } from "@/lib/salon";
import { GuestBookingForm } from "@/components/calendar/GuestBookingForm";
import { routing } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale?: string }>;
  searchParams: Promise<{ date?: string }>;
};

export const dynamic = "force-dynamic";

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = neděle, 1 = pondělí, …
  const daysToSubtract = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - daysToSubtract);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function GuestBookingPage({ params, searchParams }: PageProps) {
  const resolved = await params;
  const locale =
    resolved.locale && routing.locales.includes(resolved.locale as "cs" | "ru")
      ? resolved.locale
      : await getLocale();

  const t = await getTranslations({ locale, namespace: "guestBooking" });
  const tCal = await getTranslations({ locale, namespace: "calendar" });
  const supabase = createServerAdminClient();

  const { date: dateParam } = await searchParams;
  const today = new Date();
  const dateStr =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : today.toISOString().slice(0, 10);

  const startOfDay = new Date(`${dateStr}T00:00:00`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999`);
  const startOfDayIso = startOfDay.toISOString();
  const endOfDayIso = endOfDay.toISOString();

  const [
    { data: restrictions },
    { data: appointments },
    { data: lastMinute },
    { data: salonRow },
  ] = await Promise.all([
    supabase
      .from("availability_restrictions")
      .select("restriction_date")
      .eq("restriction_date", dateStr),
    supabase
      .from("appointments")
      .select("id, client_id, guest_client_name, start_at, end_at")
      .gte("start_at", startOfDayIso)
      .lte("start_at", endOfDayIso)
      .in("status", ["pending", "confirmed", "completed"]),
    supabase
      .from("last_minute_offers")
      .select("start_time, end_time, price_czk")
      .eq("offer_date", dateStr),
    supabase
      .from("salon_info")
      .select("calendar_display_start, calendar_display_end, default_slot_minutes")
      .eq("id", SALON_INFO_ID)
      .single(),
  ]);

  const slots = getFreeSlotsForDate(dateStr, restrictions ?? [], appointments ?? [], lastMinute ?? []);
  const minDate = today.toISOString().slice(0, 10);
  const localeStr = locale === "ru" ? "ru-RU" : "cs-CZ";

  const displayStart =
    (salonRow as { calendar_display_start?: string } | null)?.calendar_display_start?.slice(0, 5) ??
    "08:00";
  const displayEnd =
    (salonRow as { calendar_display_end?: string } | null)?.calendar_display_end?.slice(0, 5) ??
    "20:00";

  // Týdenní přehled jako v klientském kalendáři (řádky s dny a modře podbarvené volné termíny).
  const baseDate = new Date(`${dateStr}T12:00:00`);
  const weekStart = getMonday(baseDate);
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDays.push(d);
  }
  const weekStartKey = toLocalDateKey(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const weekEndKey = toLocalDateKey(weekEnd);

  const prevWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevWeekKeyStr = toLocalDateKey(prevWeekStart);
  const nextMondayDate = new Date(
    weekStart.getFullYear(),
    weekStart.getMonth(),
    weekStart.getDate() + 7
  );
  const nextWeekKeyStr = toLocalDateKey(nextMondayDate);

  const [restrictionsWeekRes, volnoWeekRes] = await Promise.all([
    supabase
      .from("availability_restrictions")
      .select("restriction_date, restriction_type, note")
      .gte("restriction_date", weekStartKey)
      .lte("restriction_date", weekEndKey),
    supabase
      .from("appointments")
      .select("id, start_at, end_at, status, is_last_minute, guest_client_name")
      .is("client_id", null)
      .in("status", ["pending", "confirmed"])
      .gte("start_at", weekStart.toISOString())
      .lte("start_at", weekEnd.toISOString())
      .order("start_at", { ascending: true }),
  ]);

  type VolnoRow = {
    id: string;
    start_at: string;
    end_at: string;
    status: string;
    is_last_minute: boolean;
    guest_client_name: string | null;
  };

  const restrictionsByDate: Record<
    string,
    { restriction_type: string; note: string | null }
  > = {};
  (restrictionsWeekRes.data ?? []).forEach(
    (r: { restriction_date: string; restriction_type: string; note: string | null }) => {
      restrictionsByDate[r.restriction_date] = {
        restriction_type: r.restriction_type,
        note: r.note,
      };
    }
  );

  const byDate: Record<string, VolnoRow[]> = {};
  weekDays.forEach((d) => {
    byDate[toLocalDateKey(d)] = [];
  });
  (volnoWeekRes.data ?? []).forEach((apt) => {
    const row = apt as VolnoRow;
    // Sloty s přiřazeným guest_client_name NEJSOU pro guest kalendář volné.
    if (row.guest_client_name && row.guest_client_name.trim() !== "") return;
    const key = toLocalDateKey(new Date(row.start_at));
    if (byDate[key]) byDate[key].push(row);
  });

  return (
    <div className="min-h-screen flex flex-col p-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-primary-600 text-sm mb-4"
      >
        ← {t("backToHome")}
      </Link>
      <div className="flex-1 max-w-md w-full mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-primary-800">{t("title")}</h1>
        <p className="text-sm text-primary-600">{t("desc")}</p>

        <section aria-label={tCal("weekView")} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <Link
                href={{ pathname: "/calendar/guest", query: { date: prevWeekKeyStr } }}
                className="p-2 rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50"
                aria-label={tCal("prevWeek")}
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <span className="text-sm font-medium text-primary-800 min-w-[180px] text-center">
                {weekDays[0].toLocaleDateString(localeStr, { month: "long", year: "numeric" })}
                {" – "}
                {weekDays[0].getDate()}.{weekDays[0].getMonth() + 1}. –{" "}
                {weekDays[6].getDate()}.{weekDays[6].getMonth() + 1}.
              </span>
              <Link
                href={{ pathname: "/calendar/guest", query: { date: nextWeekKeyStr } }}
                className="p-2 rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50"
                aria-label={tCal("nextWeek")}
              >
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
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
            const isSelected = key === dateStr;
            const restrictionLabel =
              restriction?.restriction_type === "sick"
                ? tCal("restrictionSick")
                : restriction?.restriction_type === "vacation"
                  ? tCal("restrictionVacation")
                  : restriction
                    ? tCal("restrictionOther")
                    : null;

            if (restriction) {
              return (
                <div
                  key={key}
                  className="flex flex-col gap-1 rounded-xl border border-primary-200 bg-primary-50/50 p-3 opacity-75 cursor-default"
                  aria-disabled="true"
                >
                  <span className="font-medium text-primary-500 shrink-0">{dayLabel}</span>
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span className="text-xs font-medium text-primary-600">
                      {restrictionLabel}
                    </span>
                    {restriction.note?.trim() && (
                      <span className="text-xs text-primary-500">
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
                href={{ pathname: "/calendar/guest", query: { date: key } }}
                className={`flex items-center justify-between gap-2 rounded-xl border p-3 transition-colors ${
                  isSelected
                    ? "border-primary-500 bg-primary-50 hover:bg-primary-100"
                    : isToday
                      ? "border-primary-300 bg-primary-25 hover:bg-primary-50"
                      : "border-primary-100 bg-white hover:bg-primary-50"
                }`}
              >
                <span className="font-medium shrink-0 text-primary-800">
                  {dayLabel}
                </span>
                <div className="flex flex-wrap gap-1.5 justify-end min-w-0">
                  {dayAppointments.length === 0 ? (
                    <span className="text-xs text-primary-500">{tCal("noSlots")}</span>
                  ) : (
                    Array.from(
                      new Set(
                        dayAppointments.map((apt) =>
                          new Date(apt.start_at).toLocaleTimeString(localeStr, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        )
                      )
                    ).map((timeStr) => (
                      <span
                        key={timeStr}
                        className="bg-sky-100 text-sky-800 text-xs font-medium px-2 py-0.5 rounded"
                      >
                        {timeStr}
                      </span>
                    ))
                  )}
                </div>
              </Link>
            );
          })}
        </section>

        <GuestBookingForm
          locale={locale}
          selectedDate={dateStr}
          minDate={minDate}
          slots={slots}
          localeStr={localeStr}
          displayStart={displayStart}
          displayEnd={displayEnd}
        />
      </div>
    </div>
  );
}
