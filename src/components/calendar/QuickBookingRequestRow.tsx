"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { approveQuickBookingRequest, rejectQuickBookingRequest } from "@/app/dashboard/calendar/actions";

type RequestRow = {
  id: string;
  requested_date: string;
  requested_start_time: string;
  requested_end_time: string;
  note: string | null;
  created_at: string;
  client: { display_name: string | null } | null;
};

type QuickBookingRequestRowProps = {
  request: RequestRow;
  localeStr: string;
  onResolved?: () => void;
};

export function QuickBookingRequestRow({ request, localeStr, onResolved }: QuickBookingRequestRowProps) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const resolved = () => {
    onResolved?.();
    router.refresh();
  };
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const date = new Date(request.requested_date + "T12:00:00");
  const dateLabel = date.toLocaleDateString(localeStr, { weekday: "short", day: "numeric", month: "short" });
  const startT = request.requested_start_time.slice(0, 5);
  const endT = request.requested_end_time.slice(0, 5);
  const clientName = request.client?.display_name?.trim() || "—";

  const handleApprove = async () => {
    setError(null);
    setLoading("approve");
    const result = await approveQuickBookingRequest(request.id);
    setLoading(null);
    if (result.error) setError(result.error);
    else resolved();
  };

  const handleReject = async () => {
    setError(null);
    if (showRejectInput && !rejectReason.trim()) return;
    setLoading("reject");
    const result = await rejectQuickBookingRequest(request.id, rejectReason.trim() || undefined);
    setLoading(null);
    if (result.error) setError(result.error);
    else resolved();
  };

  return (
    <li className="rounded-xl border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-950 p-4 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-primary-800 dark:text-primary-100">{clientName}</span>
        <span className="text-sm text-primary-500 dark:text-primary-400">{dateLabel}</span>
      </div>
      <p className="text-sm text-primary-700 dark:text-primary-200">
        {startT} – {endT}
        {request.note && (
          <span className="block mt-1 text-primary-600 dark:text-primary-400">„{request.note}“</span>
        )}
      </p>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {showRejectInput && (
        <div>
          <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
            {t("rejectRequestReason")}
          </label>
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t("rejectReasonPlaceholder")}
            className="w-full rounded-lg border border-primary-300 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2 text-sm"
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={handleApprove}
          disabled={loading !== null}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading === "approve" ? "…" : t("approveRequest")}
        </button>
        {!showRejectInput ? (
          <button
            type="button"
            onClick={() => setShowRejectInput(true)}
            className="px-3 py-1.5 rounded-lg border border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-300 text-sm"
          >
            {t("rejectRequest")}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleReject}
            disabled={loading !== null}
            className="px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
          >
            {loading === "reject" ? "…" : t("sendRejection")}
          </button>
        )}
      </div>
    </li>
  );
}
