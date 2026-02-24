"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createBroadcast } from "@/app/dashboard/broadcast/actions";
import { Loader2, Send } from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

export function BroadcastForm() {
  const t = useTranslations("broadcast");
  const tCommon = useTranslations("common");
  const [body, setBody] = useState("");
  const [showFrom, setShowFrom] = useState(today);
  const [showUntil, setShowUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    const formData = new FormData();
    formData.set("body", body);
    formData.set("show_from", showFrom);
    if (showUntil) formData.set("show_until", showUntil);
    const result = await createBroadcast(formData);
    setSaving(false);
    if (result.error) setError(result.error);
    else {
      setSuccess(true);
      setBody("");
      setShowFrom(today);
      setShowUntil("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <label className="block">
        <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
          {t("bodyPlaceholder")}
        </span>
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("bodyPlaceholder")}
          rows={4}
          required
          className="mt-1 block w-full rounded-lg border border-primary-200 dark:border-primary-700 px-3 py-2 text-primary-900 dark:text-primary-100 bg-white dark:bg-primary-950"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
            {t("showFrom")}
          </span>
          <input
            type="date"
            name="show_from"
            value={showFrom}
            onChange={(e) => setShowFrom(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-primary-200 dark:border-primary-700 px-3 py-2 text-primary-900 dark:text-primary-100 bg-white dark:bg-primary-950"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
            {t("showUntil")}
          </span>
          <input
            type="date"
            name="show_until"
            value={showUntil}
            onChange={(e) => setShowUntil(e.target.value)}
            min={showFrom}
            className="mt-1 block w-full rounded-lg border border-primary-200 dark:border-primary-700 px-3 py-2 text-primary-900 dark:text-primary-100 bg-white dark:bg-primary-950"
          />
        </label>
      </div>
      <p className="text-xs text-primary-600 dark:text-primary-400">
        {t("permanent")}
      </p>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          {t("success")}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {tCommon("loading")}
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            {t("send")}
          </>
        )}
      </button>
    </form>
  );
}
