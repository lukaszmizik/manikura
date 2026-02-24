"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { clientConfirmAppointment, clientRejectAppointment } from "@/app/dashboard/calendar/actions";
import { markNotificationRead, deleteNotification } from "@/app/dashboard/notifications/actions";
import { X } from "lucide-react";
import { useState } from "react";

type Props = {
  notificationId: string;
  appointmentId: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
};

export function AppointmentToConfirmItem({
  notificationId,
  appointmentId,
  title,
  body,
  readAt,
  createdAt,
}: Props) {
  const t = useTranslations("calendar");
  const tCommon = useTranslations("common");
  const tNotif = useTranslations("notifications");
  const router = useRouter();
  const [loading, setLoading] = useState<"confirm" | "reject" | "delete" | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setLoading("confirm");
    const res = await clientConfirmAppointment(appointmentId);
    setLoading(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    await markNotificationRead(notificationId);
    router.refresh();
  }

  async function handleRejectSubmit() {
    const reason = rejectReason.trim();
    if (!reason) {
      setError(t("rejectReasonRequired"));
      return;
    }
    setError(null);
    setLoading("reject");
    const res = await clientRejectAppointment(appointmentId, reason);
    setLoading(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    await markNotificationRead(notificationId);
    router.refresh();
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (loading) return;
    setLoading("delete");
    await deleteNotification(notificationId);
    setLoading(null);
    router.refresh();
  }

  const resolved = !!readAt;

  return (
    <li className="relative">
      <div
        className={`w-full text-left p-4 pr-10 rounded-xl border transition-colors ${
          resolved
            ? "bg-primary-50/50 border-primary-100 dark:bg-primary-900/20 dark:border-primary-800"
            : "bg-white border-primary-200 dark:bg-primary-900/40 dark:border-primary-700"
        }`}
      >
        <button
          type="button"
          onClick={handleDelete}
          disabled={!!loading}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-primary-400 hover:text-primary-600 hover:bg-primary-100 dark:hover:text-primary-500 dark:hover:bg-primary-800 disabled:opacity-50"
          aria-label={tNotif("deleteMessageAria")}
        >
          <X className="w-4 h-4" />
        </button>
        <p className="font-medium text-primary-800 dark:text-primary-100">{title}</p>
        {body && <p className="text-sm text-primary-600 dark:text-primary-300 mt-1">{body}</p>}
        <p className="text-xs text-primary-400 dark:text-primary-500 mt-2">
          {new Date(createdAt).toLocaleString("cs-CZ")}
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2" role="alert">{error}</p>}
        {!resolved && !showRejectForm && (
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!!loading}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading === "confirm" ? "…" : t("confirm")}
            </button>
            <button
              type="button"
              onClick={() => setShowRejectForm(true)}
              disabled={!!loading}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-200 dark:hover:bg-red-900/30 disabled:opacity-50"
            >
              {loading === "reject" ? "…" : t("reject")}
            </button>
          </div>
        )}
        {!resolved && showRejectForm && (
          <div className="mt-3 space-y-2">
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300">
              {t("rejectReasonLabel")}
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t("rejectReasonPlaceholder")}
              rows={2}
              className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowRejectForm(false); setRejectReason(""); setError(null); }}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-primary-200 text-primary-700 dark:border-primary-600 dark:text-primary-200"
              >
                {tCommon("cancel")}
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={!!loading}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {loading === "reject" ? "…" : t("sendRejection")}
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
