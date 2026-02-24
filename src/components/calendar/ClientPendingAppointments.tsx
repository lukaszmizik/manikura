"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { clientRequestCancellation, clientDismissCancelledAppointment } from "@/app/dashboard/calendar/actions";
import { X } from "lucide-react";

type Apt = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  note?: string | null;
  cancellation_requested_at?: string | null;
  cancellation_requested_read_at?: string | null;
};

export function ClientPendingAppointments({
  list,
  localeStr,
  appointmentIdsFromApprovedRequest = [],
}: {
  list: Apt[];
  localeStr: string;
  /** Termíny vzešlé ze schválené žádosti – u nich zobrazit „Čeká na vaše potvrzení“. */
  appointmentIdsFromApprovedRequest?: string[];
}) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const displayList = useMemo(
    () => list.filter((apt) => new Date(apt.end_at).getTime() > now),
    [list, now]
  );

  const handleDismissSlot = async (appointmentId: string) => {
    setDismissingId(appointmentId);
    setError(null);
    const res = await clientDismissCancelledAppointment(appointmentId);
    setDismissingId(null);
    if (res.error) setError(res.error);
    else router.refresh();
  };

  const handleRequestCancel = async (appointmentId: string) => {
    setSubmitting(true);
    setError(null);
    const res = await clientRequestCancellation(appointmentId);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
    } else {
      setCancelModalId(null);
      router.refresh();
    }
  };

  if (displayList.length === 0) {
    return <p className="text-sm text-primary-500 dark:text-primary-400">{t("noSlots")}</p>;
  }

  return (
    <>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
      )}
      <ul className="space-y-2">
        {displayList.map((apt) => {
          const start = new Date(apt.start_at);
          const end = new Date(apt.end_at);
          const dateStr = start.toLocaleDateString(localeStr, { weekday: "short", day: "numeric", month: "short" });
          const timeStr = `${start.toLocaleTimeString(localeStr, { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString(localeStr, { hour: "2-digit", minute: "2-digit" })}`;
          const isPending = apt.status === "pending";
          const isConfirmed = apt.status === "confirmed";
          const cancellationRequested = !!apt.cancellation_requested_at;
          const cancellationRead = !!apt.cancellation_requested_read_at;
          const isFromApprovedRequest = appointmentIdsFromApprovedRequest.includes(apt.id);
          const pendingLabel = isFromApprovedRequest ? t("waitingForYourConfirm") : t("waitingForAdminConfirm");

          const canClickToCancel = (isPending || isConfirmed) && !cancellationRequested;
          const isCancelledByClient = cancellationRequested && cancellationRead;
          const cancelStatusMessage = cancellationRequested
            ? cancellationRead
              ? t("cancellationReadByAdmin")
              : t("cancellationWaitingForAdmin")
            : null;

          const borderClass = cancellationRequested
            ? cancellationRead
              ? "border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20"
              : "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"
            : isPending
              ? "border-primary-200 dark:border-primary-700 bg-primary-100/50 dark:bg-primary-800/30 opacity-90"
              : "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30";

          return (
            <li
              key={apt.id}
              role={canClickToCancel ? "button" : undefined}
              tabIndex={canClickToCancel ? 0 : undefined}
              onClick={canClickToCancel ? () => { setCancelModalId(apt.id); setError(null); } : undefined}
              onKeyDown={
                canClickToCancel
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setCancelModalId(apt.id);
                        setError(null);
                      }
                    }
                  : undefined
              }
              className={`flex flex-wrap items-center gap-2 rounded-lg border p-3 ${borderClass} ${canClickToCancel ? "cursor-pointer hover:ring-2 hover:ring-primary-400 dark:hover:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-400" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <span className={`font-medium ${isPending ? "text-primary-600 dark:text-primary-400" : "text-primary-800 dark:text-primary-100"}`}>
                  {dateStr}
                </span>
                <span className={`ml-1 ${isPending ? "text-primary-500 dark:text-primary-500" : "text-primary-600 dark:text-primary-400"}`}>
                  {timeStr}
                </span>
                {cancelStatusMessage ? (
                  cancellationRequested && !cancellationRead ? (
                    <p className="mt-0.5 text-xs text-primary-600 dark:text-primary-400 italic">
                      {cancelStatusMessage}
                    </p>
                  ) : (
                    <>
                      <span className="ml-2 text-xs text-primary-600 dark:text-primary-400">
                        {cancelStatusMessage}
                      </span>
                      <p className="mt-0.5 text-xs text-primary-500 dark:text-primary-500">
                        {t("cancelledVisitByClient")}
                      </p>
                    </>
                  )
                ) : (
                  <>
                    {isPending ? (
                      <span className="ml-2 text-xs text-primary-500 dark:text-primary-400">{pendingLabel}</span>
                    ) : (
                      <span className="ml-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">{t("confirmed")}</span>
                    )}
                  </>
                )}
                {apt.note?.trim() && (
                  <p className="mt-1 text-xs text-primary-600 dark:text-primary-400 italic">„{apt.note.trim()}“</p>
                )}
              </div>
              {isCancelledByClient && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismissSlot(apt.id);
                  }}
                  disabled={dismissingId === apt.id}
                  className="shrink-0 p-1.5 rounded-full text-primary-500 hover:bg-primary-200 dark:hover:bg-primary-700 hover:text-primary-700 dark:hover:text-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:opacity-50"
                  aria-label={t("dismissSlot")}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {cancelModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" aria-modal="true" role="dialog">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-primary-900 shadow-lg p-4 space-y-4">
            <h3 className="text-lg font-semibold text-primary-800 dark:text-primary-100">{t("cancelAppointmentTitle")}</h3>
            <p className="text-sm text-primary-600 dark:text-primary-400">{t("cancelAppointmentConfirm")}</p>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setCancelModalId(null); setError(null); }}
                className="px-3 py-2 rounded-lg border border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-200 text-sm font-medium"
              >
                {t("cancelAppointmentBack")}
              </button>
              <button
                type="button"
                onClick={() => handleRequestCancel(cancelModalId)}
                disabled={submitting}
                className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {submitting ? "…" : t("cancelAppointmentSubmit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
