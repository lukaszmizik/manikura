"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updateDefaultSlotMinutes } from "@/app/dashboard/calendar/actions";

const SLOT_OPTIONS = [30, 60, 90, 120] as const;

type Props = {
  initialMinutes: number;
};

export function DefaultSlotLengthForm({ initialMinutes }: Props) {
  const t = useTranslations("calendarSettings");
  const [minutes, setMinutes] = useState(
    SLOT_OPTIONS.includes(initialMinutes as (typeof SLOT_OPTIONS)[number]) ? initialMinutes : 120
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await updateDefaultSlotMinutes(minutes);
    setSaving(false);
    if (res.error) {
      setMessage({ type: "error", text: res.error });
    } else {
      setMessage({ type: "ok", text: t("defaultSlotLengthSaved") });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <p
          className={`text-sm p-3 rounded-lg ${
            message.type === "ok"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
          }`}
        >
          {message.text}
        </p>
      )}
      <p className="text-sm text-primary-600 dark:text-primary-400">{t("defaultSlotLengthHint")}</p>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2 text-sm text-primary-900 dark:text-primary-100"
        >
          {SLOT_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {t("minutes", { count: m })}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium disabled:opacity-50"
        >
          {saving ? "…" : t("defaultSlotLengthSave")}
        </button>
      </div>
    </form>
  );
}
