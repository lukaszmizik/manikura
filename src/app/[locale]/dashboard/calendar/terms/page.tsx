import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { ClientPendingAppointments } from "@/components/calendar/ClientPendingAppointments";
import { AdminPendingReservations } from "@/components/calendar/AdminPendingReservations";
import { AdminCancellationRequests } from "@/components/calendar/AdminCancellationRequests";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale?: string }>;
};

export default async function TermsPage({ params }: PageProps) {
  noStore();
  const resolved = await params;
  const locale = resolved.locale && routing.locales.includes(resolved.locale as "cs" | "ru")
    ? resolved.locale
    : await getLocale();

  const t = await getTranslations({ locale, namespace: "calendar" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/auth/login", locale });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const localeStr = locale === "ru" ? "ru-RU" : "cs-CZ";

  if (profile?.role === "admin") {
    const [
      { data: pendingData },
      { data: confirmedData },
      { data: cancellationRequestsData },
    ] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, start_at, end_at, status, client:profiles!client_id(display_name)")
        .not("client_id", "is", null)
        .eq("status", "pending")
        .is("cancellation_requested_at", null)
        .gte("end_at", new Date().toISOString())
        .order("start_at", { ascending: true }),
      supabase
        .from("appointments")
        .select("id, start_at, end_at, status, client:profiles!client_id(display_name)")
        .not("client_id", "is", null)
        .eq("status", "confirmed")
        .gte("end_at", new Date().toISOString())
        .order("start_at", { ascending: true }),
      supabase
        .from("appointments")
        .select("id, start_at, end_at, status, client:profiles!client_id(display_name)")
        .not("client_id", "is", null)
        .not("cancellation_requested_at", "is", null)
        .is("cancellation_requested_read_at", null)
        .gte("end_at", new Date().toISOString())
        .order("start_at", { ascending: true }),
    ]);

    type AptRowRaw = {
      id: string;
      start_at: string;
      end_at: string;
      status: string;
      client?: { display_name: string | null }[] | { display_name: string | null } | null;
    };
    type AptRow = { id: string; start_at: string; end_at: string; status: string; client: { display_name: string | null } | null };
    const norm = (arr: AptRowRaw[]): AptRow[] =>
      arr.map((r) => {
        const raw = r.client;
        const client = Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null);
        return { ...r, client };
      });
    const cancellationRequestsList = norm((cancellationRequestsData ?? []) as AptRowRaw[]);
    const pendingList = norm((pendingData ?? []) as AptRowRaw[]);
    type ConfirmedRow = AptRow;
    const confirmedList = norm((confirmedData ?? []) as AptRowRaw[]);

    function toLocalDateKey(iso: string): string {
      const d = new Date(iso);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }

    const byDay: Record<string, ConfirmedRow[]> = {};
    confirmedList.forEach((apt) => {
      const key = toLocalDateKey(apt.start_at);
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(apt);
    });
    const sortedDays = Object.keys(byDay).sort();

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100">{t("termsTitle")}</h2>
          <p className="text-sm text-primary-600 dark:text-primary-400">{t("termsDesc")}</p>
        </div>
        <AdminCancellationRequests list={cancellationRequestsList} localeStr={localeStr} />
        <AdminPendingReservations list={pendingList} localeStr={localeStr} />
        {sortedDays.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-primary-700 dark:text-primary-300">
              {t("confirmedTermsByDay")}
            </h3>
            <div className="space-y-4">
              {sortedDays.map((dayKey) => {
                const dayApts = byDay[dayKey];
                const first = new Date(dayApts[0].start_at);
                const dayLabel = first.toLocaleDateString(localeStr, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
                return (
                  <div key={dayKey}>
                    <p className="text-sm font-medium text-primary-700 dark:text-primary-300 mb-1.5">{dayLabel}</p>
                    <ul className="list-disc list-inside space-y-0.5 text-sm text-primary-600 dark:text-primary-400">
                      {dayApts.map((apt) => {
                        const start = new Date(apt.start_at);
                        const end = new Date(apt.end_at);
                        const timeStr = `${start.toLocaleTimeString(localeStr, { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString(localeStr, { hour: "2-digit", minute: "2-digit" })}`;
                        const name = apt.client?.display_name?.trim() || "—";
                        return (
                          <li key={apt.id}>
                            {timeStr} · {name}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    );
  }

  const nowIso = new Date().toISOString();
  const [
    { data: activeAppointments },
    { data: cancelledWithRequest },
    { data: approvedRequestsData },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, start_at, end_at, status, is_last_minute, note, cancellation_requested_at, cancellation_requested_read_at")
      .eq("client_id", user!.id)
      .in("status", ["pending", "confirmed"])
      .gte("end_at", nowIso)
      .order("start_at", { ascending: true }),
    supabase
      .from("appointments")
      .select("id, start_at, end_at, status, is_last_minute, note, cancellation_requested_at, cancellation_requested_read_at")
      .eq("client_id", user!.id)
      .eq("status", "cancelled")
      .not("cancellation_requested_at", "is", null)
      .gte("end_at", nowIso)
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

  type ClientApt = {
    id: string;
    start_at: string;
    end_at: string;
    status: string;
    is_last_minute: boolean;
    note: string | null;
    cancellation_requested_at: string | null;
    cancellation_requested_read_at: string | null;
  };
  const clientList: ClientApt[] = [
    ...(activeAppointments ?? []),
    ...(cancelledWithRequest ?? []),
  ].sort(
    (a, b) => new Date((a as ClientApt).start_at).getTime() - new Date((b as ClientApt).start_at).getTime()
  ) as ClientApt[];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100">{t("termsTitle")}</h2>
      <p className="text-sm text-primary-600 dark:text-primary-400">{t("termsDesc")}</p>
      <ClientPendingAppointments
        list={clientList}
        localeStr={localeStr}
        appointmentIdsFromApprovedRequest={appointmentIdsFromApprovedRequest}
      />
    </div>
  );
}
