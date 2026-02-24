"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { createQuickBookingRequest } from "@/app/dashboard/calendar/actions";

type RequestSlotModalProps = {
  dateStr: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export function RequestSlotModal({ dateStr, onClose, onSuccess }: RequestSlotModalProps) {
  const t = useTranslations("calendar");
  const tCommon = useTranslations("common");
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [endHour, setEndHour] = useState("10");
  const [endMinute, setEndMinute] = useState("00");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const startTime = `${startHour}:${startMinute}`;
    const endTime = `${endHour}:${endMinute}`;
    const startAt = new Date(`${dateStr}T${startTime}`);
    const endAt = new Date(`${dateStr}T${endTime}`);
    if (endAt.getTime() <= startAt.getTime()) {
      setError("Čas konce musí být po čase začátku.");
      return;
    }
    setSaving(true);
    const result = await createQuickBookingRequest({
      requestedDate: dateStr,
      requestedStartTime: `${startTime}:00`,
      requestedEndTime: `${endTime}:00`,
      startAtIso: startAt.toISOString(),
      endAtIso: endAt.toISOString(),
      note: note.trim() || null,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    onSuccess?.();
    setTimeout(() => onClose(), 1500);
  };

  if (success) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="bg-white dark:bg-primary-950 rounded-2xl shadow-xl max-w-md w-full p-6 border border-primary-200 dark:border-primary-800 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-primary-700 dark:text-primary-200">{t("requestSent")}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-slot-title"
    >
      <div
        className="bg-white dark:bg-primary-950 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-primary-200 dark:border-primary-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-primary-200 dark:border-primary-800">
          <h2 id="request-slot-title" className="text-lg font-semibold text-primary-800 dark:text-primary-100">
            {t("requestSlotTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-800"
            aria-label={tCommon("cancel")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-primary-600 dark:text-primary-400">{t("requestSlotHint")}</p>
          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
              {t("requestedTime")}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-1">
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="rounded-lg border border-primary-300 dark:border-primary-700 bg-white dark:bg-primary-900 text-primary-800 dark:text-primary-100 px-2 py-2 text-sm"
                >
                  {Array.from({ length: 24 }, (_, h) => h).map((h) => {
                    const label = h.toString().padStart(2, "0");
                    return (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <span className="text-primary-600">:</span>
                <select
                  value={startMinute}
                  onChange={(e) => setStartMinute(e.target.value)}
                  className="rounded-lg border border-primary-300 dark:border-primary-700 bg-white dark:bg-primary-900 text-primary-800 dark:text-primary-100 px-2 py-2 text-sm"
                >
                  {["00", "15", "30", "45"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-primary-500 text-center sm:px-1">–</span>
              <div className="flex items-center gap-1">
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="rounded-lg border border-primary-300 dark:border-primary-700 bg-white dark:bg-primary-900 text-primary-800 dark:text-primary-100 px-2 py-2 text-sm"
                >
                  {Array.from({ length: 24 }, (_, h) => h).map((h) => {
                    const label = h.toString().padStart(2, "0");
                    return (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <span className="text-primary-600">:</span>
                <select
                  value={endMinute}
                  onChange={(e) => setEndMinute(e.target.value)}
                  className="rounded-lg border border-primary-300 dark:border-primary-700 bg-white dark:bg-primary-900 text-primary-800 dark:text-primary-100 px-2 py-2 text-sm"
                >
                  {["00", "15", "30", "45"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
              {t("whatToDo")}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("whatToDoPlaceholder")}
              className="w-full rounded-lg border border-primary-300 dark:border-primary-700 bg-white dark:bg-primary-900 text-primary-800 dark:text-primary-100 px-3 py-2"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? tCommon("loading") : t("submitRequest")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
