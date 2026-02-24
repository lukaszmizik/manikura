"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { markAllNotificationsRead } from "@/app/dashboard/notifications/actions";

/** Při zobrazení stránky Upozornění označí všechna upozornění jako přečtená (zvoneček zhasne). */
export function MarkAllNotificationsReadOnView() {
  const router = useRouter();

  useEffect(() => {
    markAllNotificationsRead().then((res) => {
      if (!res.error) router.refresh();
    });
  }, [router]);

  return null;
}
