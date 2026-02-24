import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { AppointmentChangeRequestItem } from "@/components/notifications/AppointmentChangeRequestItem";
import { AppointmentToConfirmItem } from "@/components/notifications/AppointmentToConfirmItem";
import { MarkAllNotificationsReadOnView } from "@/components/notifications/MarkAllNotificationsReadOnView";

const PAGE_SIZE = 10;
const DAYS_TO_KEEP = 10;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function NotificationsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page: pageParam } = await searchParams;
  const t = await getTranslations({ locale, namespace: "notifications" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);
  const cutoffIso = cutoffDate.toISOString();

  await supabase
    .from("notifications")
    .delete()
    .eq("user_id", user!.id)
    .lt("created_at", cutoffIso);

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, read_at, created_at, meta")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const list = (notifications ?? []) as Array<{
    id: string;
    type: string;
    title: string;
    body: string | null;
    read_at: string | null;
    created_at: string;
    meta: { request_id?: string; request_type?: string; appointment_id?: string } | null;
  }>;

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, parseInt(pageParam ?? "1", 10) || 1));
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = list.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-4">
      <MarkAllNotificationsReadOnView />
      <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100">{t("title")}</h2>
      <p className="text-xs text-primary-500 dark:text-primary-500">
        {t("cleanupInfo", { days: DAYS_TO_KEEP })}
      </p>
      {!list.length ? (
        <div className="flex flex-col items-center gap-2 py-8 text-primary-500">
          <Bell className="w-12 h-12" />
          <p className="text-sm">{t("none")}</p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {pageItems.map((n) =>
              n.type === "appointment_to_confirm" && n.meta?.appointment_id ? (
                <AppointmentToConfirmItem
                  key={n.id}
                  notificationId={n.id}
                  appointmentId={n.meta.appointment_id}
                  title={n.title}
                  body={n.body}
                  readAt={n.read_at}
                  createdAt={n.created_at}
                />
              ) : n.type === "appointment_change_request" && n.meta?.request_id ? (
                <AppointmentChangeRequestItem
                  key={n.id}
                  notificationId={n.id}
                  requestId={n.meta.request_id}
                  requestType={n.meta.request_type ?? "edit"}
                  title={n.title}
                  body={n.body}
                  readAt={n.read_at}
                  createdAt={n.created_at}
                />
              ) : (
                <NotificationItem
                  key={n.id}
                  id={n.id}
                  title={n.title}
                  body={n.body}
                  readAt={n.read_at}
                  createdAt={n.created_at}
                />
              )
            )}
          </ul>

          {totalPages > 1 && (
            <nav
              className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-primary-200 dark:border-primary-700"
              aria-label={t("paginationAria")}
            >
              <p className="text-sm text-primary-500 dark:text-primary-400">
                {t("pageInfo", { current: page, total: totalPages })}
              </p>
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={{ pathname: "/dashboard/notifications", query: { page: String(page - 1) } }}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary-200 dark:border-primary-700 px-3 py-1.5 text-sm font-medium text-primary-700 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-800/50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t("prevPage")}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-primary-100 dark:border-primary-800 px-3 py-1.5 text-sm text-primary-400 dark:text-primary-500 cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" />
                    {t("prevPage")}
                  </span>
                )}
                {page < totalPages ? (
                  <Link
                    href={{ pathname: "/dashboard/notifications", query: { page: String(page + 1) } }}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary-200 dark:border-primary-700 px-3 py-1.5 text-sm font-medium text-primary-700 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-800/50"
                  >
                    {t("nextPage")}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-primary-100 dark:border-primary-800 px-3 py-1.5 text-sm text-primary-400 dark:text-primary-500 cursor-not-allowed">
                    {t("nextPage")}
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
