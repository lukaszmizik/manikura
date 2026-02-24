import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, History } from "lucide-react";
import { HistoryRestoreButton } from "@/components/calendar/HistoryRestoreButton";

export const dynamic = "force-dynamic";

const HISTORY_DAYS = 30;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function CalendarHistoryPage({ params }: PageProps) {
  noStore();
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "calendar" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/auth/login", locale });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (profile?.role !== "admin") redirect({ href: "/dashboard/calendar", locale });

  const since = new Date();
  since.setDate(since.getDate() - HISTORY_DAYS);
  const sinceIso = since.toISOString();

  const { data: appointmentsData } = await supabase
    .from("appointments")
    .select("id, start_at, end_at, cancelled_at, cancelled_reason, client_id, guest_client_name, client:profiles!client_id(display_name)")
    .eq("status", "cancelled")
    .gte("cancelled_at", sinceIso)
    .order("cancelled_at", { ascending: false });

  type HistoryRow = {
    id: string;
    start_at: string;
    end_at: string;
    cancelled_at: string | null;
    cancelled_reason: string | null;
    client_id: string | null;
    guest_client_name: string | null;
    client: { display_name: string | null }[] | null;
  };
  const appointments: HistoryRow[] = (appointmentsData ?? []) as HistoryRow[];

  const localeStr = locale === "ru" ? "ru-RU" : "cs-CZ";

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/calendar"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
      >
        <ChevronLeft className="w-4 h-4" />
        {t("backToCalendar")}
      </Link>
      <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100 flex items-center gap-2">
        <History className="w-6 h-6" />
        {t("historyTitle")}
      </h2>
      <p className="text-sm text-primary-600 dark:text-primary-400">{t("historyDesc")}</p>
      {appointments.length === 0 ? (
        <p className="text-sm text-primary-500 dark:text-primary-400">{t("historyEmpty")}</p>
      ) : (
        <ul className="space-y-3">
          {appointments.map((apt) => {
            const start = new Date(apt.start_at);
            const dateStr = start.toLocaleDateString(localeStr, {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const timeStr = `${start.toLocaleTimeString(localeStr, { hour: "2-digit", minute: "2-digit" })} – ${new Date(apt.end_at).toLocaleTimeString(localeStr, { hour: "2-digit", minute: "2-digit" })}`;
            const clientName =
              (apt.client_id && (apt.client?.[0]?.display_name?.trim())) ||
              (apt.guest_client_name?.trim()) ||
              "—";
            return (
              <li
                key={apt.id}
                className="rounded-xl border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-950 p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-primary-800 dark:text-primary-100">{clientName}</p>
                  <p className="text-sm text-primary-600 dark:text-primary-400">
                    {dateStr} · {timeStr}
                  </p>
                  {apt.cancelled_reason && (
                    <p className="text-xs text-primary-500 dark:text-primary-500 mt-1">
                      {t("historyReason")}: {apt.cancelled_reason}
                    </p>
                  )}
                </div>
                <HistoryRestoreButton appointmentId={apt.id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
