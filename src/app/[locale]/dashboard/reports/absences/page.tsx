import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AbsencesReportPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reports" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/auth/login", locale });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (profile?.role !== "admin") redirect({ href: "/dashboard", locale });

  const { data: cancelled } = await supabase
    .from("appointments")
    .select("id, start_at, end_at, status, client_id, client:profiles!client_id(display_name)")
    .eq("status", "cancelled")
    .order("start_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/reports"
        className="inline-flex items-center gap-2 text-primary-600 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("backToReports")}
      </Link>
      <h2 className="text-xl font-semibold text-primary-800">{t("absences")}</h2>
      <p className="text-sm text-primary-600">{t("absencesDesc")}</p>
      {!cancelled?.length ? (
        <p className="text-sm text-primary-500">{t("noCancelledTerms")}</p>
      ) : (
        <ul className="space-y-2">
          {cancelled.map((apt) => {
            const anyApt = apt as unknown as {
              id: string;
              start_at: string;
              status: string;
              client?: { display_name: string | null } | null;
            };
            const dateStr = new Date(anyApt.start_at).toLocaleString("cs-CZ", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
            const clientName = anyApt.client?.display_name?.trim() || "—";
            return (
              <li key={anyApt.id} className="p-3 rounded-lg bg-primary-50 border border-primary-100">
                <span className="text-primary-800">{dateStr}</span>
                <span className="ml-2 text-primary-600">{clientName}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
