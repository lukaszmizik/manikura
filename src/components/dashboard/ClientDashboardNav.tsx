"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Home, Calendar, List, Bell, Image as ImageIcon, Settings, Banknote, MessageSquare } from "lucide-react";

/**
* Navigace pouze pro klientku.
* Položky: Úvod, Rezervace, Termíny, Upozornění, Zprávy, Fotky, Nastavení.
*/
type ClientNavItem = {
  href: string;
  labelKey: "home" | "bookings" | "terms" | "pricelist" | "notifications" | "messages" | "photos" | "settings" | "unreadCount";
  icon: React.ElementType;
  badgeType?: "broadcasts" | "notifications";
};

const CLIENT_NAV_ITEMS: ClientNavItem[] = [
  { href: "/dashboard", labelKey: "home", icon: Home },
  { href: "/dashboard/calendar", labelKey: "bookings", icon: Calendar },
  { href: "/dashboard/calendar/terms", labelKey: "terms", icon: List },
  { href: "/dashboard/pricelist", labelKey: "pricelist", icon: Banknote },
  { href: "/dashboard/notifications", labelKey: "notifications", icon: Bell, badgeType: "notifications" },
  { href: "/dashboard/messages", labelKey: "messages", icon: MessageSquare, badgeType: "broadcasts" },
  { href: "/dashboard/gallery", labelKey: "photos", icon: ImageIcon },
  { href: "/dashboard/settings", labelKey: "settings", icon: Settings },
];

type ClientDashboardNavProps = {
  unreadBroadcastsCount?: number;
  unreadNotifications?: number;
};

export function ClientDashboardNav({ unreadBroadcastsCount = 0, unreadNotifications = 0 }: ClientDashboardNavProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const isLinkActive = (href: string) => {
    if (pathname === href) return true;
    if (href === "/dashboard" || !pathname.startsWith(href)) return false;
    const hasLongerMatch = CLIENT_NAV_ITEMS.some(
      (item) => item.href !== href && item.href.length > href.length && pathname.startsWith(item.href)
    );
    return !hasLongerMatch;
  };

  return (
    <nav className="flex items-center gap-1 flex-wrap" aria-label={t("ariaClient")}>
      {CLIENT_NAV_ITEMS.map(({ href, labelKey, icon: Icon, badgeType }) => {
        const isActive = isLinkActive(href);
        const badgeCount =
          badgeType === "notifications" ? unreadNotifications : badgeType === "broadcasts" ? unreadBroadcastsCount : 0;
        const showItemBadge = badgeCount > 0;
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
              {showItemBadge && (
                <span
                  className="absolute -top-1 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-primary-500 text-white text-[10px] font-semibold px-1"
                  aria-label={t("unreadCount", { count: badgeCount })}
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
