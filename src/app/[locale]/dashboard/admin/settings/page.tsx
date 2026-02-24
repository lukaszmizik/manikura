import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Settings } from "lucide-react";
import { SalonSettingsForm } from "@/components/salon/SalonSettingsForm";
import { getSalonInfo } from "@/app/dashboard/admin/settings/actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminSettingsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "salon" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/auth/login", locale });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (profile?.role !== "admin") redirect({ href: "/dashboard", locale });

  const salonInfo = await getSalonInfo();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("backToDashboard")}
      </Link>
      <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100 flex items-center gap-2">
        <Settings className="w-5 h-5" />
        {t("title")}
      </h2>
      <SalonSettingsForm initialData={salonInfo} />
    </div>
  );
}
