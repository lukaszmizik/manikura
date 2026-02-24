import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { DailyReportDatePicker } from "@/components/reports/DailyReportDatePicker";

export const dynamic = "force-dynamic";

type AppointmentRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  is_last_minute: boolean;
  guest_client_name?: string | null;
  client?: { display_name: string | null } | null;
};

export default async function DailyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const t = await getTranslations("reports");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/auth/login", locale });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (profile?.role !== "admin") redirect({ href: "/dashboard", locale });

  const { date: dateParam } = await searchParams;
  const today = new Date();
  const dateStr =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : today.toISOString().slice(0, 10);
  const nextDay = new Date(dateStr);
  nextDay.setDate(nextDay.getDate() + 1);
  const startAt = new Date(dateStr + "T00:00:00.000Z");
  const endAt = new Date(nextDay.toISOString().slice(0, 10) + "T00:00:00.000Z");

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, start_at, end_at, status, is_last_minute, guest_client_name, client:profiles!client_id(display_name)")
    .in("status", ["pending", "confirmed"])
    .gte("start_at", startAt.toISOString())
    .lt("start_at", endAt.toISOString())
    .order("start_at", { ascending: true });

  const localeStr = locale === "ru" ? "ru-RU" : "cs-CZ";
  const dayLabel = new Date(dateStr + "T12:00:00").toLocaleDateString(localeStr, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center gap-3">
        <Link
          href="/dashboard/reports"
          className="p-2 rounded-lg text-primary-600 hover:bg-primary-50"
          aria-label={t("backToReports")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-xl font-semibold text-primary-800">{t("dailyReport")}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <DailyReportDatePicker currentDate={dateStr} />
      </div>

      <div id="daily-program" className="rounded-xl border border-primary-200 bg-white p-4 print:border print:shadow-none">
        <h3 className="text-lg font-semibold text-primary-800 mb-4">{dayLabel}</h3>
        {((appointments ?? []) as unknown as AppointmentRow[]).length > 0 ? (
          <ul className="space-y-2">
            {((appointments ?? []) as unknown as AppointmentRow[]).map((apt) => (
              <li
                key={apt.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-primary-100 last:border-0"
              >
                <span className="font-medium text-primary-800 tabular-nums">
                  {new Date(apt.start_at).toLocaleTimeString(localeStr, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  –
                  {new Date(apt.end_at).toLocaleTimeString(localeStr, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-primary-700">
                  {(apt.guest_client_name && apt.guest_client_name.trim()) ||
                    (apt.client && typeof apt.client === "object" && "display_name" in apt.client
                      ? (apt.client.display_name ?? "—")
                      : "—")}
                </span>
                {apt.is_last_minute && (
                  <span className="text-xs text-amber-700 font-medium">{t("lastMinute")}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-primary-500 text-sm">{t("noAppointmentsDay")}</p>
        )}
      </div>
    </div>
  );
}
