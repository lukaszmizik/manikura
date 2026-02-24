"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { adminConfirmAppointment, rejectAppointment } from "@/app/dashboard/calendar/actions";
import { useState } from "react";

type Apt = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  client?: { display_name: string | null } | null;
};

export function AdminPendingReservations({
  list,
  localeStr,
}: {
  list: Apt[];
  localeStr: string;
}) {
  const t = useTranslations("calendar");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(id: string) {
    setError(null);
    setLoadingId(id);
    const res = await adminConfirmAppointment(id);
    setLoadingId(null);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  async function handleReject(id: string) {
    const reason = rejectReason.trim();
    if (!reason) {
      setError(t("rejectReasonRequired"));
      return;
    }
    setError(null);
    setLoadingId(id);
    const res = await rejectAppointment(id, reason);
    setLoadingId(null);
    setRejectingId(null);
    setRejectReason("");
    if (res.error) setError(res.error);
    else router.refresh();
  }

  if (list.length === 0) {
    return <p className="text-sm text-primary-500 dark:text-primary-400">{t("noPendingReservations")}</p>;
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-primary-700 dark:text-primary-300">
        {t("pendingReservationsToConfirm")}
      </h3>
      <ul className="space-y-2">
        {list.map((apt) => {
          const start = new Date(apt.start_at);
          const end = new Date(apt.end_at);
          const dateStr = start.toLocaleDateString(localeStr, { weekday: "short", day: "numeric", month: "short" });
          const timeStr = `${start.toLocaleTimeString(localeStr, { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString(localeStr, { hour: "2-digit", minute: "2-digit" })}`;
          const clientName = apt.client?.display_name?.trim() || "—";
          const isRejecting = rejectingId === apt.id;
          const isLoading = loadingId === apt.id;
          return (
            <li
              key={apt.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-950 p-3"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium text-primary-800 dark:text-primary-100">{clientName}</span>
                <span className="text-primary-600 dark:text-primary-400 ml-1">{dateStr}</span>
                <span className="text-primary-600 dark:text-primary-400 ml-1">{timeStr}</span>
              </div>
              {!isRejecting ? (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleConfirm(apt.id)}
                    disabled={!!loadingId}
                    className="px-2.5 py-1 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {loadingId === apt.id ? "…" : t("confirm")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectingId(apt.id)}
                    disabled={!!loadingId}
                    className="px-2.5 py-1 text-sm font-medium rounded-lg border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-200 disabled:opacity-50"
                  >
                    {t("reject")}
                  </button>
                </div>
              ) : (
                <div className="w-full mt-2 space-y-1.5">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={t("rejectReasonPlaceholder")}
                    rows={2}
                    className="w-full rounded-lg border border-primary-200 dark:border-primary-700 px-2 py-1.5 text-sm bg-white dark:bg-primary-900"
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => { setRejectingId(null); setRejectReason(""); setError(null); }}
                      className="px-2 py-1 text-sm rounded-lg border border-primary-200 text-primary-700 dark:border-primary-600"
                    >
                      {tCommon("cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(apt.id)}
                      disabled={!!loadingId}
                      className="px-2 py-1 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                    >
                      {isLoading ? "…" : t("sendRejection")}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
    </section>
  );
}
