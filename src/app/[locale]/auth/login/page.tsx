"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function LoginPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Pokud už je uživatel přihlášený (např. po kliknutí na magic link),
  // rovnou ho pošleme na přehled termínů.
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (data?.user) {
        router.replace("/dashboard/calendar/terms");
        router.refresh();
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400">
          ← {t("backToHome")}
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 mb-6">
          <Sparkles className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-100 mb-2">{t("login")}</h1>
        <p className="text-primary-600 dark:text-primary-400 text-sm mb-6">{t("loginDesc")}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm">
              {error}
            </div>
          )}
          <label className="block">
            <span className="text-sm font-medium text-primary-800 dark:text-primary-200">{t("email")}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900/50 px-4 py-3 text-primary-900 dark:text-primary-100 placeholder:text-primary-400"
              placeholder={t("emailPlaceholder")}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-primary-800 dark:text-primary-200">{t("password")}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900/50 px-4 py-3 text-primary-900 dark:text-primary-100"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary-500 text-white font-medium disabled:opacity-50 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500"
          >
            {loading ? t("submitting") : t("submitLogin")}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-primary-600 dark:text-primary-400">
          {t("noAccount")}{" "}
          <Link href="/auth/register" className="font-medium text-primary-600 dark:text-primary-300 underline">
            {t("registerLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
