import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { ChevronLeft } from "lucide-react";
import { QuickBookingRequestRow } from "@/components/calendar/QuickBookingRequestRow";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function CalendarRequestsPage({ params }: PageProps) {
  noStore();
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "calendar" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/auth/login", locale });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (profile?.role !== "admin") redirect({ href: "/dashboard/calendar", locale });

  const { data: requestsData } = await supabase
    .from("quick_booking_requests")
    .select("id, requested_date, requested_start_time, requested_end_time, note, created_at, client:profiles!client_id(display_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  type RequestRow = {
    id: string;
    requested_date: string;
    requested_start_time: string;
    requested_end_time: string;
    note: string | null;
    created_at: string;
    client: { display_name: string | null }[] | null;
  };
  const requestsRaw = (requestsData ?? []) as RequestRow[];
  const requests = requestsRaw.map((req) => ({
    ...req,
    client: req.client?.[0] ?? null,
  })) as Array<{ id: string; requested_date: string; requested_start_time: string; requested_end_time: string; note: string | null; created_at: string; client: { display_name: string | null } | null }>;

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
      <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100">{t("requestsTitle")}</h2>
      <p className="text-sm text-primary-600 dark:text-primary-400">{t("requestsDesc")}</p>
      {requests.length === 0 ? (
        <p className="text-sm text-primary-500 dark:text-primary-400">{t("requestsEmpty")}</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((req) => (
            <QuickBookingRequestRow
              key={req.id}
              request={req}
              localeStr={localeStr}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
