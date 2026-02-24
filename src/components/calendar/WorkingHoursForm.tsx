"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { saveWorkingHours } from "@/app/dashboard/calendar/actions";
import { DAY_NAMES } from "@/lib/calendar";

type HoursMap = Record<number, { start_time: string; end_time: string }>;

export function WorkingHoursForm({ initialHours }: { initialHours: HoursMap }) {
  const t = useTranslations("calendar");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [hours, setHours] = useState<HoursMap>(() => {
    const h: HoursMap = {};
    for (let d = 0; d <= 6; d++) {
      const existing = initialHours[d];
      h[d] = existing
        ? { start_time: existing.start_time.slice(0, 5), end_time: existing.end_time.slice(0, 5) }
        : { start_time: "09:00", end_time: "17:00" };
    }
    return h;
  });
  const [active, setActive] = useState<Record<number, boolean>>(() => {
    const a: Record<number, boolean> = {};
    for (let d = 0; d <= 6; d++) {
      const existing = initialHours[d];
      a[d] = existing ? existing.start_time !== "00:00" && existing.end_time !== "00:00" : false;
    }
    return a;
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    for (let d = 0; d <= 6; d++) {
      formData.set(`day_${d}_active`, active[d] ? "on" : "off");
      formData.set(`day_${d}_start`, hours[d].start_time);
      formData.set(`day_${d}_end`, hours[d].end_time);
    }
    const { error } = await saveWorkingHours(formData);
    setSaving(false);
    if (error) setMessage({ type: "error", text: error });
    else setMessage({ type: "ok", text: "Pracovní doba uložena." });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <p
          className={`text-sm p-3 rounded-lg ${
            message.type === "ok" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </p>
      )}
      <div className="space-y-3">
        {([0, 1, 2, 3, 4, 5, 6] as number[]).map((day) => (
          <div
            key={day}
            className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-primary-50 border border-primary-100"
          >
            <label className="flex items-center gap-2 w-24">
              <input
                type="checkbox"
                checked={active[day] ?? false}
                onChange={(e) => setActive((a) => ({ ...a, [day]: e.target.checked }))}
                className="rounded border-primary-300"
              />
              <span className="font-medium text-primary-800">{DAY_NAMES[day]}</span>
            </label>
            {active[day] && (
              <>
                <input
                  type="time"
                  step={900}
                  value={hours[day]?.start_time ?? "09:00"}
                  onChange={(e) =>
                    setHours((h) => ({ ...h, [day]: { ...h[day], start_time: e.target.value } }))
                  }
                  className="rounded-lg border border-primary-200 px-2 py-1.5 text-sm"
                />
                <span className="text-primary-500">–</span>
                <input
                  type="time"
                  step={900}
                  value={hours[day]?.end_time ?? "17:00"}
                  onChange={(e) =>
                    setHours((h) => ({ ...h, [day]: { ...h[day], end_time: e.target.value } }))
                  }
                  className="rounded-lg border border-primary-200 px-2 py-1.5 text-sm"
                />
              </>
            )}
            {!active[day] && <span className="text-sm text-primary-500">{t("closed")}</span>}
          </div>
        ))}
      </div>
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 rounded-xl bg-primary-500 text-white font-medium disabled:opacity-50"
      >
        {saving ? "Ukládám…" : "Uložit pracovní dobu"}
      </button>
    </form>
  );
}
