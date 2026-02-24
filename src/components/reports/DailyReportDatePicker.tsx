"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function DailyReportDatePicker({ currentDate }: { currentDate: string }) {
  const router = useRouter();
  const t = useTranslations("common");

  function onDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (v) router.push(`/dashboard/reports/daily?date=${v}`);
  }

  return (
    <label className="flex items-center gap-2">
      <span className="text-sm font-medium text-primary-700">{t("date")}</span>
      <input
        type="date"
        value={currentDate}
        onChange={onDateChange}
        className="rounded-xl border border-primary-200 px-3 py-2 text-primary-800"
      />
    </label>
  );
}
