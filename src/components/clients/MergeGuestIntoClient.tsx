"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { mergeGuestIntoClient } from "@/app/dashboard/clients/actions";
import { Link2, Loader2 } from "lucide-react";

type Props = {
  guestProfileId: string;
  guestDisplayName: string | null;
  /** Kód pro klientku – zobrazí se manikérce, aby ho předala klientce pro propojení účtu. */
  claimCode: string | null;
};

export function MergeGuestIntoClient({ guestProfileId, guestDisplayName, claimCode }: Props) {
  const t = useTranslations("clients");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await mergeGuestIntoClient(guestProfileId, email);
    setLoading(false);
    if (res.error) setError(res.error);
    else router.push("/dashboard/clients");
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
        <Link2 className="w-4 h-4" />
        {t("mergeGuestTitle")}
      </h3>
      <p className="text-sm text-amber-700 dark:text-amber-300">
        {t("mergeGuestDesc")}
      </p>
      {claimCode && (
        <p className="text-sm font-mono font-semibold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/40 px-3 py-2 rounded-lg">
          {t("claimCodeLabel")}: <span className="tracking-widest">{claimCode}</span>
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("mergeGuestEmailLabel")}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("mergeGuestEmailPlaceholder")}
            required
            className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-primary-900 px-3 py-2 text-primary-900 dark:text-primary-100 placeholder:text-primary-400"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {t("mergeGuestSubmit")}
        </button>
      </form>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
