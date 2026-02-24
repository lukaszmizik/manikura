import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

type BroadcastRow = {
  id: string;
  body: string;
  show_from: string;
  show_until: string | null;
  created_at: string;
};

export default async function MessagesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page: pageParam } = await searchParams;
  const t = await getTranslations({ locale, namespace: "messages" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/auth/login", locale });

  const { data: profile } = await supabase.from("profiles").select("role, last_broadcasts_read_at").eq("id", user!.id).single();
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
  if (isAdmin) redirect({ href: "/dashboard", locale });

  const lastReadAt = (profile as { last_broadcasts_read_at?: string | null } | null)?.last_broadcasts_read_at ?? null;
  const cutoff = lastReadAt ? new Date(lastReadAt).getTime() : 0;

  const { data: broadcasts } = await supabase
    .from("admin_broadcasts")
    .select("id, body, show_from, show_until, created_at")
    .order("created_at", { ascending: false });

  const list = (broadcasts ?? []) as BroadcastRow[];

  const withRead = list.map((msg) => ({
    ...msg,
    isUnread: new Date(msg.created_at).getTime() > cutoff,
  }));
  const unread = withRead.filter((m) => m.isUnread);
  const read = withRead.filter((m) => !m.isUnread);
  const combined = [...unread, ...read];

  await supabase
    .from("profiles")
    .update({ last_broadcasts_read_at: new Date().toISOString() })
    .eq("id", user!.id);

  const localeStr = locale === "ru" ? "ru-RU" : "cs-CZ";
  const totalPages = Math.max(1, Math.ceil(combined.length / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, parseInt(pageParam ?? "1", 10) || 1));
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = combined.slice(start, start + PAGE_SIZE);
  const unreadOnPage = pageItems.filter((m) => m.isUnread);
  const readOnPage = pageItems.filter((m) => !m.isUnread);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100 flex items-center gap-2">
        <Bell className="w-5 h-5" />
        {t("title")}
      </h2>
      <p className="text-sm text-primary-600 dark:text-primary-400">
        {t("fromAdmin")}
      </p>
      {combined.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-primary-500 dark:text-primary-400">
          <Bell className="w-12 h-12 opacity-50" />
          <p className="text-sm">{t("none")}</p>
        </div>
      ) : (
        <>
          {unreadOnPage.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-500" aria-hidden />
                {t("unreadTitle")}
              </h3>
              <ul className="space-y-3">
                {unreadOnPage.map((msg) => (
                  <MessageCard key={msg.id} msg={msg} localeStr={localeStr} t={t} isUnread />
                ))}
              </ul>
            </section>
          )}
          {readOnPage.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-primary-500 dark:text-primary-400 mb-2">
                {t("readTitle")}
              </h3>
              <ul className="space-y-3">
                {readOnPage.map((msg) => (
                  <MessageCard key={msg.id} msg={msg} localeStr={localeStr} t={t} isUnread={false} />
                ))}
              </ul>
            </section>
          )}

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
                    href={{ pathname: "/dashboard/messages", query: { page: String(page - 1) } }}
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
                    href={{ pathname: "/dashboard/messages", query: { page: String(page + 1) } }}
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

function MessageCard({
  msg,
  localeStr,
  t,
  isUnread,
}: {
  msg: BroadcastRow & { isUnread: boolean };
  localeStr: string;
  t: (key: string, values?: Record<string, string | number>) => string;
  isUnread: boolean;
}) {
  const isPermanent = msg.show_until == null;
  return (
    <li
      className={`rounded-xl border p-4 shadow-sm ${
        isUnread
          ? "border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/40"
          : "border-primary-200 dark:border-primary-800 bg-white dark:bg-primary-950"
      }`}
    >
      <p className={`text-primary-800 dark:text-primary-100 whitespace-pre-wrap ${isUnread ? "font-semibold" : ""}`}>
        {msg.body}
      </p>
      <p className="mt-2 text-xs text-primary-500 dark:text-primary-400">
        {isPermanent
          ? t("visiblePermanent")
          : t("visibleUntil", {
              date: new Date(msg.show_until!).toLocaleDateString(localeStr, {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            })}
      </p>
    </li>
  );
}
