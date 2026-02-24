"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { processPendingClaimCode } from "@/app/dashboard/clients/actions";

/**
 * Po prvním přihlášení (např. po ověření e-mailu) zpracuje kód od manikérky
 * uložený v user_metadata z registrace. Spustí se jednou při načtení dashboardu.
 */
export function ProcessPendingClaimCode() {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    processPendingClaimCode().then((res) => {
      if (!res.error) router.refresh();
    });
  }, [router]);

  return null;
}
