"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createAppointmentChangeRequest } from "@/app/dashboard/notifications/actions";
import { Loader2, AlertTriangle } from "lucide-react";

type Apt = {
  id: string;
  status: string;
  note: string | null;
};

export function ClientAppointmentEditForm({
  appointment,
  onSuccess,
}: {
  appointment: Apt;
  onSuccess?: () => void;
}) {
  const t = useTranslations("calendar");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [note, setNote] = useState(appointment.note ?? "");
  const [changeReason, setChangeReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isConfirmed = appointment.status === "confirmed";
  const requiresReason = isConfirmed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (requiresReason && !changeReason.trim()) {
      setError(t("changeReasonLabel") + " je povinné.");
      return;
    }
    setSaving(true);
    const res = await createAppointmentChangeRequest(appointment.id, "edit", {
      note: note.trim() || null,
      change_reason: requiresReason ? changeReason.trim() : undefined,
    });
    setSaving(false);
    if (res.error) setError(res.error);
    else {
      onSuccess?.();
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-primary-950 p-4">
      <h3 className="text-sm font-semibold text-primary-800 dark:text-primary-100">
        {t("editAppointment")}
      </h3>
      {isConfirmed && (
        <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700 p-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-200">{t("confirmedEditWarning")}</p>
        </div>
      )}
      <label className="block">
        <span className="text-sm font-medium text-primary-800 dark:text-primary-200">{t("note")}</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-lg border border-primary-200 dark:border-primary-700 px-3 py-2 text-primary-900 dark:text-primary-100 bg-white dark:bg-primary-950"
        />
      </label>
      {requiresReason && (
        <label className="block">
          <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
            {t("changeReasonLabel")} *
          </span>
          <textarea
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            placeholder={t("changeReasonPlaceholder")}
            rows={2}
            required
            className="mt-1 block w-full rounded-lg border border-primary-200 dark:border-primary-700 px-3 py-2 text-primary-900 dark:text-primary-100 bg-white dark:bg-primary-950"
          />
        </label>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          {t("requestSentForApproval")}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {tCommon("loading")}
          </>
        ) : (
          t("saveChanges")
        )}
      </button>
    </form>
  );
}
