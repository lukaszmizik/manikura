"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { markNotificationRead, deleteNotification } from "@/app/dashboard/notifications/actions";
import { X } from "lucide-react";
import { useState } from "react";

type Props = {
  id: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationItem({ id, title, body, readAt, createdAt }: Props) {
  const router = useRouter();
  const t = useTranslations("notifications");
  const [deleting, setDeleting] = useState(false);

  async function handleClick() {
    if (readAt) return;
    await markNotificationRead(id);
    router.refresh();
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (deleting) return;
    setDeleting(true);
    await deleteNotification(id);
    setDeleting(false);
    router.refresh();
  }

  return (
    <li className="relative group">
      <button
        type="button"
        onClick={handleClick}
        className={`w-full text-left p-4 pr-10 rounded-xl border transition-colors ${
          readAt
            ? "bg-primary-50/50 border-primary-100 dark:bg-primary-900/20 dark:border-primary-800"
            : "bg-white border-primary-200 hover:border-primary-300 dark:bg-primary-900/40 dark:border-primary-700 dark:hover:border-primary-600"
        }`}
      >
        <p className="font-medium text-primary-800 dark:text-primary-100">{title}</p>
        {body && <p className="text-sm text-primary-600 dark:text-primary-300 mt-1">{body}</p>}
        <p className="text-xs text-primary-400 dark:text-primary-500 mt-2">
          {new Date(createdAt).toLocaleString("cs-CZ")}
        </p>
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-primary-400 hover:text-primary-600 hover:bg-primary-100 dark:hover:text-primary-500 dark:hover:bg-primary-800 disabled:opacity-50"
        aria-label={t("deleteMessageAria")}
      >
        <X className="w-4 h-4" />
      </button>
    </li>
  );
}
