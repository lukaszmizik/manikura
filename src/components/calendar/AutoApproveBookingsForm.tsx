"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updateAutoApproveBookings } from "@/app/dashboard/calendar/actions";

type Props = {
  initialChecked: boolean;
};

export function AutoApproveBookingsForm({ initialChecked }: Props) {
  const t = useTranslations("calendarSettings");
  const [checked, setChecked] = useState(initialChecked);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.checked;
    setChecked(value);
    setSaving(true);
    setMessage(null);
    const res = await updateAutoApproveBookings(value);
    setSaving(false);
    if (res.error) {
      setMessage({ type: "error", text: res.error });
    } else {
      setMessage({ type: "ok", text: t("autoApproveSaved") });
    }
  }

  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
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
      <p className="text-sm text-primary-600 dark:text-primary-400">{t("autoApproveHint")}</p>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={saving}
          className="rounded border-primary-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
          {t("autoApproveLabel")}
        </span>
        {saving && <span className="text-sm text-primary-500">…</span>}
      </label>
    </form>
  );
}
