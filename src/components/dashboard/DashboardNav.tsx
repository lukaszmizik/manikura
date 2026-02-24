"use client";

import { AdminDashboardNav } from "./AdminDashboardNav";
import { ClientDashboardNav } from "./ClientDashboardNav";

/**
 * Hlavičková navigace dashboardu.
 * Oddělené menu pro administrátora (Úvod, Kalendář, Termíny, Klientky, Upozornění, Nastavení)
 * a pro klientku (Úvod, Rezervace, Termíny, Zprávy, Fotky, Nastavení) – každá role má vlastní komponentu a ikony.
 */
type DashboardNavProps = {
  role: "admin" | "client";
  unreadNotifications?: number;
  unreadBroadcastsCount?: number;
  pendingSlotRequestsCount?: number;
  pendingCancellationRequestsCount?: number;
};

export function DashboardNav({
  role,
  unreadNotifications = 0,
  unreadBroadcastsCount = 0,
  pendingSlotRequestsCount = 0,
  pendingCancellationRequestsCount = 0,
}: DashboardNavProps) {
  if (role === "admin") {
    return (
      <AdminDashboardNav
        unreadNotifications={unreadNotifications}
        pendingSlotRequestsCount={pendingSlotRequestsCount}
        pendingCancellationRequestsCount={pendingCancellationRequestsCount}
      />
    );
  }
  return (
    <ClientDashboardNav
      unreadBroadcastsCount={unreadBroadcastsCount}
      unreadNotifications={unreadNotifications}
    />
  );
}
