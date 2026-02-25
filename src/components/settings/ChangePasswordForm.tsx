"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Lock } from "lucide-react";

const MIN_PASSWORD_LENGTH = 6;

type ChangePasswordFormProps = {
  userEmail: string;
};

export function ChangePasswordForm({ userEmail }: ChangePasswordFormProps) {
  const t = useTranslations("myProfile");
  const tCommon = useTranslations("common");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError(t("changePasswordErrorMismatch"));
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t("changePasswordErrorShort"));
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <section className="rounded-xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-primary-950 p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-primary-800 dark:text-primary-100 flex items-center gap-2 mb-4">
        <Lock className="w-5 h-5" />
        {t("changePassword")}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <label className="block">
          <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
            {t("newPassword")}
          </span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            className="mt-1 block w-full rounded-lg border border-primary-200 dark:border-primary-700 px-3 py-2 text-primary-900 dark:text-primary-100 bg-white dark:bg-primary-950"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
            {t("confirmPassword")}
          </span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            className="mt-1 block w-full rounded-lg border border-primary-200 dark:border-primary-700 px-3 py-2 text-primary-900 dark:text-primary-100 bg-white dark:bg-primary-950"
          />
        </label>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
            {t("changePasswordSuccess")}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {tCommon("loading")}
            </>
          ) : (
            t("changePasswordButton")
          )}
        </button>
      </form>
    </section>
  );
}
