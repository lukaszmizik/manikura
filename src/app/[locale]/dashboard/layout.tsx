import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DashboardLayout({ children, params }: Props) {
  noStore();
  const { locale } = await params;
  if (!routing.locales.includes(locale as "cs" | "ru")) {
    redirect({ href: "/dashboard", locale: routing.defaultLocale });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/auth/login", locale });
  }

  const t = await getTranslations({ locale, namespace: "dashboard" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, last_broadcasts_read_at")
    .eq("id", user!.id)
    .maybeSingle();

  const roleRaw =
    profile?.role != null
      ? String(profile.role).toLowerCase().trim()
      : null;
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
  const forceAdmin =
    adminEmails.length > 0 && emailLower && adminEmails.includes(emailLower);
  const role = forceAdmin ? "admin" : roleFromDb;

  const displayName = profile?.display_name || user!.email?.split("@")[0] || tCommon("account");

  let unreadNotifications = 0;
  let unreadBroadcastsCount = 0;
  let pendingSlotRequestsCount = 0;
  let pendingCancellationRequestsCount = 0;

  const [{ count: notifCount }, { data: broadcasts }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .is("read_at", null),
    supabase.from("admin_broadcasts").select("id, created_at"),
  ]);
  unreadNotifications = notifCount ?? 0;

  if (role === "admin") {
    const nowIso = new Date().toISOString();
    const [{ count: requestsCount }, { count: cancellationsCount }] = await Promise.all([
      supabase
        .from("quick_booking_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .not("client_id", "is", null)
        .not("cancellation_requested_at", "is", null)
        .is("cancellation_requested_read_at", null)
        .gte("end_at", nowIso),
    ]);
    pendingSlotRequestsCount = requestsCount ?? 0;
    pendingCancellationRequestsCount = cancellationsCount ?? 0;
  } else {
    const lastRead = (profile as { last_broadcasts_read_at?: string | null } | null)?.last_broadcasts_read_at ?? null;
    const list = (broadcasts ?? []) as { id: string; created_at: string }[];
    const cutoff = lastRead ? new Date(lastRead).getTime() : 0;
    unreadBroadcastsCount = list.filter((b) => new Date(b.created_at).getTime() > cutoff).length;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-primary-200/50 dark:border-primary-800/50 bg-white/90 dark:bg-primary-950/90 backdrop-blur">
        <div className="p-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-primary-800 dark:text-primary-100">{t("title")}</h1>
            <p className="text-xs text-primary-500 dark:text-primary-400 truncate">
              {displayName} · {role === "admin" ? t("roleAdmin") : t("roleClient")}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
        <div className="px-2 pb-2 pt-0">
          <DashboardNav
            role={role}
            unreadNotifications={unreadNotifications}
            unreadBroadcastsCount={unreadBroadcastsCount}
            pendingSlotRequestsCount={pendingSlotRequestsCount}
            pendingCancellationRequestsCount={pendingCancellationRequestsCount}
          />
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
