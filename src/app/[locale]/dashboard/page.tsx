import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Calendar,
  Users,
  Image as ImageIcon,
  AlertCircle,
  CalendarDays,
  MessageSquare,
} from "lucide-react";
import { SalonInfoCard } from "@/components/salon/SalonInfoCard";
import { ProcessPendingClaimCode } from "@/components/clients/ProcessPendingClaimCode";
import { getSalonInfo } from "@/app/dashboard/admin/settings/actions";

function getTodayBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

type Props = { params: Promise<{ locale: string }> };

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tSalon = await getTranslations({ locale, namespace: "salon" });
  const localeStr = locale === "ru" ? "ru-RU" : "cs-CZ";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user!.id)
    .single();

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
  const name = profile?.display_name || tCommon("account");

  let greeting = t("greetingHi", { name });
  let todayAppointments: { id: string; start_at: string; end_at: string; status: string; client_id: string | null; guest_client_name?: string | null }[] = [];
  let clientNames: Record<string, string> = {};

  if (isAdmin) {
    const { start: todayStart, end: todayEnd } = getTodayBounds();
    const { data: appointmentsToday } = await supabase
      .from("appointments")
      .select("id, start_at, end_at, status, client_id, guest_client_name")
      .gte("start_at", todayStart)
      .lt("start_at", todayEnd)
      .in("status", ["pending", "confirmed", "completed"])
      .order("start_at", { ascending: true });

    todayAppointments = appointmentsToday ?? [];
    const clientIds = [...new Set((todayAppointments as { client_id: string | null }[]).map((a) => a.client_id).filter(Boolean))] as string[];

    if (clientIds.length > 0) {
      const { data: ratings } = await supabase
        .from("client_ratings")
        .select("client_id, rating")
        .in("client_id", clientIds);
      const ratingsList = ratings ?? [];
      const avgRating =
        ratingsList.length > 0
          ? ratingsList.reduce((s, r) => s + r.rating, 0) / ratingsList.length
          : null;

      if (avgRating !== null) {
        const rating = avgRating.toFixed(1);
        if (avgRating >= 4.5) greeting = t("greetingGoodDay", { rating });
        else if (avgRating < 3) greeting = t("greetingChallenge", { rating });
        else greeting = t("greetingOk", { rating });
      } else {
        greeting = t("greetingWithCount", { count: todayAppointments.length });
      }
    } else {
      greeting = t("greetingNoAppointments");
    }

    if (clientIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", clientIds);
      clientNames = Object.fromEntries(
        (profiles ?? []).map((p) => [p.id, p.display_name || tCommon("noName")])
      );
    }
  }

  const salonInfo = !isAdmin ? await getSalonInfo() : null;

  const todayLabel = new Date().toLocaleDateString(localeStr, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <p className="text-lg text-primary-800 dark:text-primary-100">{greeting}</p>

      {isAdmin && (
        <section
          id="daily-program"
          className="rounded-xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-primary-900/50 p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-primary-800 dark:text-primary-100 flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              {t("todayProgram")}
            </h2>
          </div>
          <p className="text-sm text-primary-500 dark:text-primary-400 mb-3 print:block">
            {todayLabel}
          </p>
          {todayAppointments.length === 0 ? (
            <p className="text-sm text-primary-500 dark:text-primary-400">{t("noAppointmentsToday")}</p>
          ) : (
            <ul className="space-y-2">
              {todayAppointments.map((apt) => (
                <li
                  key={apt.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-primary-100 dark:border-primary-800 last:border-0"
                >
                  <span className="font-medium text-primary-800 dark:text-primary-200">
                    {new Date(apt.start_at).toLocaleTimeString(localeStr, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    –{" "}
                    {new Date(apt.end_at).toLocaleTimeString(localeStr, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-primary-700 dark:text-primary-300">
                    {(apt.client_id && clientNames[apt.client_id]) ?? (apt.guest_client_name && apt.guest_client_name.trim()) ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {isAdmin ? (
        <div className="grid grid-cols-2 gap-3 no-print">
          <Link href="/dashboard/calendar" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800">
            <Calendar className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <span className="font-medium text-primary-800 dark:text-primary-100">{t("calendar")}</span>
          </Link>
          <Link href="/dashboard/clients" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800">
            <Users className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <span className="font-medium text-primary-800 dark:text-primary-100">{t("clients")}</span>
          </Link>
          <Link href="/dashboard/reports" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800">
            <AlertCircle className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <span className="font-medium text-primary-800 dark:text-primary-100">{t("reports")}</span>
          </Link>
          <Link href="/dashboard/notifications" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800">
            <AlertCircle className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <span className="font-medium text-primary-800 dark:text-primary-100">{t("notifications")}</span>
          </Link>
          <Link href="/dashboard/broadcast" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800">
            <MessageSquare className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <span className="font-medium text-primary-800 dark:text-primary-100 text-center text-sm">{t("quickMessageToAll")}</span>
          </Link>
        </div>
      ) : (
        <>
          <ProcessPendingClaimCode />
          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard/calendar" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800">
              <Calendar className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              <span className="font-medium text-primary-800 dark:text-primary-100">{t("myAppointments")}</span>
            </Link>
            <Link href="/dashboard/my-photos" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800">
              <ImageIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" aria-hidden />
              <span className="font-medium text-primary-800 dark:text-primary-100">{t("myPhotos")}</span>
            </Link>
          </div>
          <section aria-label={tSalon("contact")}>
            <SalonInfoCard info={salonInfo} />
          </section>
        </>
      )}
    </div>
  );
}
