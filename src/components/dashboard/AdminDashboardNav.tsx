"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Home, Calendar, List, History, User, Bell, Banknote, Settings, Inbox } from "lucide-react";

/**
 * Navigace pouze pro administrátora.
 * Položky: Úvod, Kalendář, Termíny, Historie, Klientky, Ceník, Upozornění, Nastavení.
 */
type AdminNavItem = {
  href: string;
  labelKey: "home" | "calendarAdmin" | "terms" | "slotRequests" | "history" | "clients" | "pricelist" | "notifications" | "settings" | "unreadCount";
  icon: React.ElementType;
  /** Badge s počtem nepřečtených upozornění */
  badge?: boolean;
  /** Badge s počtem čekajících žádostí o termín */
  badgeRequests?: boolean;
  /** Badge s počtem žádostí o zrušení termínu (žluté sloty) */
  badgeCancellations?: boolean;
};

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/dashboard", labelKey: "home", icon: Home },
  { href: "/dashboard/calendar", labelKey: "calendarAdmin", icon: Calendar },
  { href: "/dashboard/calendar/terms", labelKey: "terms", icon: List, badgeCancellations: true },
  { href: "/dashboard/calendar/requests", labelKey: "slotRequests", icon: Inbox, badgeRequests: true },
  { href: "/dashboard/calendar/history", labelKey: "history", icon: History },
  { href: "/dashboard/clients", labelKey: "clients", icon: User },
  { href: "/dashboard/pricelist", labelKey: "pricelist", icon: Banknote },
  { href: "/dashboard/notifications", labelKey: "notifications", icon: Bell, badge: true },
  { href: "/dashboard/admin/settings", labelKey: "settings", icon: Settings },
];

type AdminDashboardNavProps = {
  unreadNotifications?: number;
  pendingSlotRequestsCount?: number;
  pendingCancellationRequestsCount?: number;
};

export function AdminDashboardNav({
  unreadNotifications = 0,
  pendingSlotRequestsCount = 0,
  pendingCancellationRequestsCount = 0,
}: AdminDashboardNavProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const showNotifBadge = unreadNotifications > 0;
  const showRequestsBadge = pendingSlotRequestsCount > 0;
  const showCancellationBadge = pendingCancellationRequestsCount > 0;

  const isLinkActive = (href: string) => {
    if (pathname === href) return true;
    if (href === "/dashboard" || !pathname.startsWith(href)) return false;
    const hasLongerMatch = ADMIN_NAV_ITEMS.some(
      (item) => item.href !== href && item.href.length > href.length && pathname.startsWith(item.href)
    );
    return !hasLongerMatch;
  };

  return (
    <nav className="flex items-center gap-1 flex-wrap" aria-label={t("ariaAdmin")}>
      {ADMIN_NAV_ITEMS.map(({ href, labelKey, icon: Icon, badge, badgeRequests, badgeCancellations }) => {
        const isActive = isLinkActive(href);
        const badgeCount = badge
          ? unreadNotifications
          : badgeRequests
          ? pendingSlotRequestsCount
          : badgeCancellations
          ? pendingCancellationRequestsCount
          : 0;
        const showItemBadge =
          (badge && showNotifBadge) ||
          (badgeRequests && showRequestsBadge) ||
          (badgeCancellations && showCancellationBadge);
        return (
          <Link
            key={href}
            href={href}
            title={t(labelKey)}
            className={`relative flex items-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "text-primary-600 dark:text-primary-300 bg-primary-100 dark:bg-primary-800/50"
                : "text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-800/30"
            }`}
          >
            <span className="relative inline-flex shrink-0">
              <Icon className="w-5 h-5" />
              {showItemBadge && badgeCount > 0 && (
                <span
                  className="absolute -top-1 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-primary-500 text-white text-[10px] font-semibold px-1"
                  aria-label={
                    badgeRequests
                      ? `${badgeCount} čekajících žádostí`
                      : badgeCancellations
                      ? `${badgeCount} žádostí o zrušení`
                      : t("unreadCount", { count: badgeCount })
                  }
                >
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </span>
            <span className="hidden sm:inline">{t(labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
