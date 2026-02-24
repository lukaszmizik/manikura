"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { claimGuestByCode } from "@/app/dashboard/clients/actions";
import { Link2, Loader2 } from "lucide-react";

export function ClientClaimCodeCard() {
  const t = useTranslations("clients");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await claimGuestByCode(code);
    setLoading(false);
    if (res.error) setError(res.error);
    else {
      setSuccess(true);
      setCode("");
      router.refresh();
    }
  }

  return (
    <section className="rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/30 p-4">
      <h3 className="text-sm font-semibold text-primary-800 dark:text-primary-200 flex items-center gap-2 mb-2">
        <Link2 className="w-4 h-4" />
        {t("claimCodeCardTitle")}
      </h3>
      <p className="text-sm text-primary-600 dark:text-primary-400 mb-3">
        {t("claimCodeCardDesc")}
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("claimCodePlaceholder")}</span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("claimCodePlaceholder")}
            maxLength={10}
            className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2 font-mono text-primary-900 dark:text-primary-100 placeholder:text-primary-400 uppercase"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {t("claimCodeSubmit")}
        </button>
      </form>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-2" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2" role="status">
          {t("claimCodeSuccess")}
        </p>
      )}
    </section>
  );
}
