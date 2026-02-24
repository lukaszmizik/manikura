"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createAppointmentChangeRequest } from "@/app/dashboard/notifications/actions";
import { Loader2, Trash2 } from "lucide-react";

export function ClientAppointmentDeleteButton({ appointmentId }: { appointmentId: string }) {
  const t = useTranslations("calendar");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (!confirming) {
      setConfirming(true);
      setError(null);
      return;
    }
    setSaving(true);
    setError(null);
    const res = await createAppointmentChangeRequest(appointmentId, "delete", null);
    setSaving(false);
    if (res.error) setError(res.error);
    else router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={saving}
        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Trash2 className="w-3.5 h-3.5" />
        )}
        {t("delete")}
      </button>
      {confirming && !saving && (
        <p className="text-xs text-primary-500 max-w-[200px] text-right">
          {t("deleteRequestConfirm")}{" "}
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="underline font-medium"
          >
            {tCommon("cancel")}
          </button>
        </p>
      )}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
