"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const t = useTranslations("common");
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-primary-600 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/50 text-sm font-medium"
      aria-label={t("logoutAria")}
    >
      <LogOut className="w-4 h-4" />
      {t("logout")}
    </button>
  );
}
