"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { claimGuestByCode } from "@/app/dashboard/clients/actions";
import { Sparkles } from "lucide-react";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const codeTrimmed = claimCode.trim();
    const { data: signUpData, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          role: "client",
          ...(codeTrimmed ? { claim_code: codeTrimmed.toUpperCase() } : {}),
        },
      },
    });
    if (err) {
      setLoading(false);
      setError(err.message);
      return;
    }
    if (signUpData?.user) {
      await supabase.from("profiles").upsert(
        {
          id: signUpData.user.id,
          email: signUpData.user.email ?? email,
          display_name: displayName.trim() || signUpData.user.user_metadata?.display_name || signUpData.user.email?.split("@")[0] || null,
          role: "client",
        },
        { onConflict: "id" }
      );
      if (signUpData.session && codeTrimmed) {
        const claimRes = await claimGuestByCode(codeTrimmed.toUpperCase());
        if (claimRes.error) setError(claimRes.error);
      }
    }
    setLoading(false);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col p-4 justify-center max-w-sm mx-auto">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 text-primary-600 mb-6">
          <Sparkles className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-primary-800 mb-2">{t("verifyEmail")}</h1>
        <p className="text-primary-600 text-sm mb-6">{t("verifyEmailDesc", { email })}</p>
        <Link
          href="/auth/login"
          className="block w-full py-3 rounded-xl bg-primary-500 text-white font-medium text-center"
        >
          {t("goToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4">
      <Link href="/" className="inline-flex items-center gap-2 text-primary-600 mb-6">
        ← {t("backToHome")}
      </Link>
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 text-primary-600 mb-6">
          <Sparkles className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-primary-800 mb-2">{t("register")}</h1>
        <p className="text-primary-600 text-sm mb-6">{t("registerDesc")}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-100 text-red-800 text-sm">{error}</div>
          )}
          <label className="block">
            <span className="text-sm font-medium text-primary-800">{t("name")}</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-primary-200 px-4 py-3 text-primary-900"
              placeholder={t("namePlaceholder")}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-primary-800">{t("email")}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-primary-200 px-4 py-3 text-primary-900"
              placeholder={t("emailPlaceholder")}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-primary-800">{t("password")}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 block w-full rounded-lg border border-primary-200 px-4 py-3 text-primary-900"
              placeholder={t("passwordMin")}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-primary-800">{t("claimCodeLabel")}</span>
            <input
              type="text"
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
              placeholder={t("claimCodePlaceholder")}
              maxLength={10}
              className="mt-1 block w-full rounded-lg border border-primary-200 px-4 py-3 text-primary-900 font-mono uppercase placeholder:normal-case"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary-500 text-white font-medium disabled:opacity-50"
          >
            {loading ? t("creatingAccount") : t("submitRegister")}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-primary-600">
          {t("hasAccount")}{" "}
          <Link href="/auth/login" className="font-medium text-primary-600 underline">
            {t("submitLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
