import { redirect } from "@/i18n/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Settings } from "lucide-react";
import { MyProfileForm } from "@/components/settings/MyProfileForm";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale?: string }> };

export default async function SettingsPage({ params }: Props) {
  const resolved = await params;
  const locale =
    resolved.locale && routing.locales.includes(resolved.locale as "cs" | "ru")
      ? resolved.locale
      : await getLocale();

  const t = await getTranslations({ locale, namespace: "myProfile" });
  const tNav = await getTranslations({ locale, namespace: "nav" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/auth/login", locale });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, phone, email, photos_public_by_default")
    .eq("id", user!.id)
    .single();

  const roleRaw = profile?.role != null ? String(profile.role).toLowerCase().trim() : null;
  const roleFromDb = (roleRaw === "admin" ? "admin" : "client") as "admin" | "client";

  const adminEmailsEnv =
    typeof process !== "undefined" && process.env?.NEXT_PUBLIC_ADMIN_EMAILS
      ? process.env.NEXT_PUBLIC_ADMIN_EMAILS
      : "";
  const adminEmails = adminEmailsEnv
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const emailLower = user?.email?.toLowerCase() ?? "";
  const isAdmin =
    adminEmails.length > 0 && emailLower && adminEmails.includes(emailLower)
      ? true
      : roleFromDb === "admin";

  if (isAdmin) {
    redirect({ href: "/dashboard/admin/settings", locale });
  }

  const initialData = {
    display_name: profile?.display_name ?? null,
    phone: profile?.phone ?? null,
    email: profile?.email ?? user!.email ?? null,
    photos_public_by_default: profile?.photos_public_by_default ?? false,
  };

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        {tNav("home")}
      </Link>
      <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100 flex items-center gap-2">
        <Settings className="w-5 h-5" />
        {t("title")}
      </h2>
      <MyProfileForm initialData={initialData} />
      {user?.email && (
        <ChangePasswordForm userEmail={user.email} />
      )}
    </div>
  );
}
