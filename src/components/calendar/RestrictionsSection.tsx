"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addRestriction, deleteRestriction } from "@/app/dashboard/calendar/actions";

type Restriction = { id: string; restriction_date: string; restriction_type: string; note: string | null };

export function RestrictionsSection({ restrictions }: { restrictions: Restriction[] }) {
  const router = useRouter();
  const t = useTranslations("calendar");
  const tCommon = useTranslations("common");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setMessage(null);
    const formData = new FormData(form);
    const { error } = await addRestriction(formData);
    if (error) {
      setMessage({ type: "error", text: error });
      return;
    }
    setMessage({ type: "ok", text: t("restrictionAdded") });
    form.reset();
    setAdding(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const { error } = await deleteRestriction(id);
    if (!error) router.refresh();
  }

  const typeLabels: Record<string, string> = {
    sick: t("restrictionSick"),
    vacation: t("restrictionVacation"),
    other: t("restrictionOther"),
  };

  return (
    <div className="space-y-4">
      {message && (
        <p
          className={`text-sm p-3 rounded-lg ${
            message.type === "ok" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </p>
      )}
      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="px-4 py-2 rounded-xl border-2 border-primary-300 text-primary-700 font-medium"
        >
          + {t("addRestrictionButton")}
        </button>
      ) : (
        <form onSubmit={handleAdd} className="p-4 rounded-xl bg-primary-50 border border-primary-200 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-primary-800">{tCommon("date")}</span>
            <input type="date" name="date" required className="mt-1 block w-full rounded-lg border border-primary-200 px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-primary-800">{t("typeLabel")}</span>
            <select name="type" className="mt-1 block w-full rounded-lg border border-primary-200 px-3 py-2">
              <option value="vacation">{t("restrictionVacation")}</option>
              <option value="sick">{t("restrictionSick")}</option>
              <option value="other">{t("restrictionOther")}</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-primary-800">{t("noteOptional")}</span>
            <input type="text" name="note" className="mt-1 block w-full rounded-lg border border-primary-200 px-3 py-2" />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium">
              {t("add")}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="px-4 py-2 rounded-lg border border-primary-300">
              {tCommon("cancel")}
            </button>
          </div>
        </form>
      )}
      {restrictions.length > 0 && (
        <ul className="space-y-2">
          {restrictions.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-white border border-primary-200"
            >
              <span className="text-primary-800">
                {new Date(r.restriction_date + "Z").toLocaleDateString("cs-CZ", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span className="text-sm text-primary-600">{typeLabels[r.restriction_type] ?? r.restriction_type}</span>
              {r.note && <span className="text-sm text-primary-500 w-full">{r.note}</span>}
              {r.id && (
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  {tCommon("delete")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {restrictions.length === 0 && !adding && <p className="text-sm text-primary-500">{t("noUpcomingRestrictions")}</p>}
    </div>
  );
}
