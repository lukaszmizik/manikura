"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { adminConfirmCancellationAndRelease } from "@/app/dashboard/calendar/actions";

type Apt = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  client?: { display_name: string | null } | null;
};

export function AdminCancellationRequests({
  list,
  localeStr,
}: {
  list: Apt[];
  localeStr: string;
}) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmAndRelease(id: string) {
    setError(null);
    setLoadingId(id);
    const res = await adminConfirmCancellationAndRelease(id);
    setLoadingId(null);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  if (list.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-primary-700 dark:text-primary-300">
        {t("cancellationRequestsSection")}
      </h3>
      <ul className="space-y-2">
        {list.map((apt) => {
          const start = new Date(apt.start_at);
          const end = new Date(apt.end_at);
          const dateStr = start.toLocaleDateString(localeStr, { weekday: "short", day: "numeric", month: "short" });
          const timeStr = `${start.toLocaleTimeString(localeStr, { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString(localeStr, { hour: "2-digit", minute: "2-digit" })}`;
          const clientName = apt.client?.display_name?.trim() || "—";
          const isLoading = loadingId === apt.id;
          return (
            <li
              key={apt.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium text-primary-800 dark:text-primary-100">{clientName}</span>
                <div className="text-primary-600 dark:text-primary-400 text-sm mt-0.5">
                  <span>{dateStr}</span>
                  <span className="ml-1">{timeStr}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleConfirmAndRelease(apt.id)}
                disabled={!!loadingId}
                className="px-2.5 py-1 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {isLoading ? "…" : t("confirmAndReleaseSlot")}
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
    </section>
  );
}
