"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updateCalendarDisplayRange } from "@/app/dashboard/calendar/actions";

type Props = {
  initialStart: string;
  initialEnd: string;
};

export function CalendarDisplayRangeForm({ initialStart, initialEnd }: Props) {
  const t = useTranslations("calendarSettings");
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await updateCalendarDisplayRange(start, end);
    setSaving(false);
    if (res.error) {
      setMessage({ type: "error", text: res.error });
    } else {
      setMessage({ type: "ok", text: t("displaySaved") });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <p
          className={`text-sm p-3 rounded-lg ${
            message.type === "ok"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-primary-800 mb-1">
            {t("displayStartLabel")}
          </label>
          <input
            type="time"
            step={900}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full rounded-lg border border-primary-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary-800 mb-1">
            {t("displayEndLabel")}
          </label>
          <input
            type="time"
            step={900}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full rounded-lg border border-primary-200 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium disabled:opacity-50"
      >
        {saving ? "…" : t("displaySave")}
      </button>
    </form>
  );
}

