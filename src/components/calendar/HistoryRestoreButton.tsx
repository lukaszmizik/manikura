"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { restoreAppointmentFromHistory } from "@/app/dashboard/calendar/actions";

type HistoryRestoreButtonProps = {
  appointmentId: string;
};

export function HistoryRestoreButton({ appointmentId }: HistoryRestoreButtonProps) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleRestore() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    const result = await restoreAppointmentFromHistory(appointmentId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(t("historyRestoreSuccess"));
      setTimeout(() => {
        router.refresh();
      }, 800);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleRestore}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
      >
        {loading ? "…" : t("restore")}
      </button>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {success && !error && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400" role="status">
          {success}
        </p>
      )}
    </div>
  );
}
