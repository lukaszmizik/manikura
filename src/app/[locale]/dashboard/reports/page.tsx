import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FileText, CalendarX } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export default async function ReportsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reports" });
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-primary-800">{t("title")}</h2>
      <p className="text-sm text-primary-600">{t("desc")}</p>
      <div className="space-y-3">
        <Link
          href="/dashboard/reports/daily"
          className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-100"
        >
          <FileText className="w-8 h-8 text-primary-600" />
          <div>
            <p className="font-medium text-primary-800">{t("daily")}</p>
            <p className="text-sm text-primary-500">{t("dailyDesc")}</p>
          </div>
        </Link>
        <Link
          href="/dashboard/reports/absences"
          className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-100"
        >
          <CalendarX className="w-8 h-8 text-primary-600" />
          <div>
            <p className="font-medium text-primary-800">{t("absences")}</p>
            <p className="text-sm text-primary-500">{t("absencesDesc")}</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
