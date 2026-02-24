import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { ClientsList } from "@/components/clients/ClientsList";

type Props = { params: Promise<{ locale: string }> };

export default async function ClientsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "clients" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/auth/login", locale });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (profile?.role !== "admin") redirect({ href: "/dashboard", locale });

  const { data: clients } = await supabase
    .from("profiles")
    .select("id, display_name, email, phone")
    .eq("role", "client")
    .order("display_name");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-primary-800">{t("title")}</h2>
      <p className="text-sm text-primary-600">
        {t("desc")}
      </p>
      <ClientsList clients={clients ?? []} />
    </div>
  );
}
