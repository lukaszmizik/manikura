"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarPlus } from "lucide-react";
import { RequestSlotModal } from "./RequestSlotModal";

type RequestSlotButtonProps = {
  dateStr: string;
};

export function RequestSlotButton({ dateStr }: RequestSlotButtonProps) {
  const t = useTranslations("calendar");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary-300 dark:border-primary-700 bg-white dark:bg-primary-900 text-primary-700 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-800 font-medium"
      >
        <CalendarPlus className="w-4 h-4" />
        {t("requestSlot")}
      </button>
      {open && (
        <RequestSlotModal
          dateStr={dateStr}
          onClose={() => setOpen(false)}
          onSuccess={() => setOpen(false)}
        />
      )}
    </>
  );
}
