"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  approveAppointmentChangeRequest,
  rejectAppointmentChangeRequest,
  deleteNotification,
} from "@/app/dashboard/notifications/actions";
import { X } from "lucide-react";
import { useState } from "react";

type Props = {
  notificationId: string;
  requestId: string;
  requestType: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
};

export function AppointmentChangeRequestItem({
  notificationId,
  requestId,
  title,
  body,
  readAt,
  createdAt,
}: Props) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | "delete" | null>(null);

  async function handleApprove() {
    setLoading("approve");
    const res = await approveAppointmentChangeRequest(requestId, notificationId);
    setLoading(null);
    if (res.error) {
      // could use toast
      return;
    }
    router.refresh();
  }

  async function handleReject() {
    setLoading("reject");
    const res = await rejectAppointmentChangeRequest(requestId, notificationId);
    setLoading(null);
    if (res.error) return;
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
            : "bg-white border-primary-200 hover:border-primary-300 dark:bg-primary-900/40 dark:border-primary-700"
        }`}
      >
        <button
          type="button"
          onClick={handleDelete}
          disabled={!!loading}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-primary-400 hover:text-primary-600 hover:bg-primary-100 dark:hover:text-primary-500 dark:hover:bg-primary-800 disabled:opacity-50"
          aria-label={t("deleteMessageAria")}
        >
          <X className="w-4 h-4" />
        </button>
        <p className="font-medium text-primary-800 dark:text-primary-100">{title}</p>
        {body && <p className="text-sm text-primary-600 dark:text-primary-300 mt-1">{body}</p>}
        <p className="text-xs text-primary-400 dark:text-primary-500 mt-2">
          {new Date(createdAt).toLocaleString("cs-CZ")}
        </p>
        {!resolved && (
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleApprove}
              disabled={!!loading}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {loading === "approve" ? "…" : t("approve")}
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={!!loading}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-primary-300 text-primary-700 hover:bg-primary-50 dark:border-primary-600 dark:text-primary-200 dark:hover:bg-primary-800 disabled:opacity-50"
            >
              {loading === "reject" ? "…" : t("reject")}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
