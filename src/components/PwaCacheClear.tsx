"use client";

import { useEffect } from "react";

/**
 * Dočasný skript: při načtení smaže všechny Service Workery a Cache storage,
 * aby se vyčistila chyba "Failed to execute 'addAll' on 'Cache'".
 * Po vyřešení problémů s PWA lze komponentu odstranit.
 */
export function PwaCacheClear() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const clear = async () => {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
        }
      }
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
    };
    clear().catch(() => {});
  }, []);
  return null;
}
