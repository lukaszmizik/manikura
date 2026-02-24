import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getFreeSlotsForDate } from "@/lib/slots";
import { BookSlotPicker } from "@/components/calendar/BookSlotPicker";
import { RequestSlotButton } from "@/components/calendar/RequestSlotButton";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string }>;
};

export default async function CalendarBookPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "calendarBook" });
  const { date: dateParam } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/auth/login", locale });

  const today = new Date();
  const dateStr = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today.toISOString().slice(0, 10);

  const [
    { data: restrictions },
    { data: appointments },
    { data: lastMinute },
    { data: myAppointmentsData },
    { data: approvedRequestsData },
  ] = await Promise.all([
    supabase.from("availability_restrictions").select("restriction_date").eq("restriction_date", dateStr),
    supabase
      .from("appointments")
      .select("id, client_id, start_at, end_at")
      .gte("start_at", `${dateStr}T00:00:00`)
      .lte("start_at", `${dateStr}T23:59:59`)
      .in("status", ["pending", "confirmed", "completed"]),
    supabase.from("last_minute_offers").select("start_time, end_time, price_czk").eq("offer_date", dateStr),
    supabase
      .from("appointments")
      .select("id, start_at, end_at, status")
      .eq("client_id", user!.id)
      .in("status", ["pending", "confirmed"])
      .gte("start_at", `${dateStr}T00:00:00`)
      .lte("start_at", `${dateStr}T23:59:59`)
      .order("start_at", { ascending: true }),
    supabase
      .from("quick_booking_requests")
      .select("appointment_id")
      .eq("client_id", user!.id)
      .eq("status", "approved")
      .not("appointment_id", "is", null),
  ]);

  const appointmentIdsFromApprovedRequest = (approvedRequestsData ?? [])
    .map((r: { appointment_id: string | null }) => r.appointment_id)
    .filter((id): id is string => id != null);

  const slots = getFreeSlotsForDate(
    dateStr,
    restrictions ?? [],
    appointments ?? [],
    lastMinute ?? []
  );

  const myAppointmentsForDay = (myAppointmentsData ?? []) as Array<{
    id: string;
    start_at: string;
    end_at: string;
    status: string;
  }>;

  const minDate = today.toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <Link href="/dashboard/calendar" className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm font-medium">
        ← {t("backToCalendar")}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100">{t("title")}</h2>
        <RequestSlotButton dateStr={dateStr} />
      </div>
      <BookSlotPicker
        selectedDate={dateStr}
        minDate={minDate}
        slots={slots}
        clientId={user!.id}
        myAppointmentsForDay={myAppointmentsForDay}
        appointmentIdsFromApprovedRequest={appointmentIdsFromApprovedRequest}
      />
    </div>
  );
}
