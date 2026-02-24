import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, Banknote } from "lucide-react";
import { SALON_INFO_ID } from "@/lib/salon";
import { PricelistEditForm } from "@/components/pricelist/PricelistEditForm";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PricelistPage({ params }: PageProps) {
  noStore();
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricelist" });
  const tNav = await getTranslations({ locale, namespace: "nav" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/auth/login", locale });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const isAdmin = profile?.role === "admin";

  const { data: pricelistRows } = await supabase
    .from("pricelist_items")
    .select("id, salon_info_id, name, price_czk, sort_order, active, created_at")
    .eq("salon_info_id", SALON_INFO_ID)
    .order("sort_order", { ascending: true });

  const items = (pricelistRows ?? []) as {
    id: string;
    salon_info_id: string;
    name: string;
    price_czk: number;
    sort_order: number;
    active: boolean;
    created_at: string;
  }[];
  const activeItems = items.filter((i) => i.active);
  const hasAny = activeItems.length > 0;

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
      >
        <ChevronLeft className="w-4 h-4" />
        {tNav("home")}
      </Link>
      <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100 flex items-center gap-2">
        <Banknote className="w-6 h-6" />
        {t("pageTitle")}
      </h2>
      {isAdmin ? (
        <>
          <h3 className="text-lg font-medium text-primary-700 dark:text-primary-200">{t("editTitle")}</h3>
          <div className="rounded-xl border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-950 p-4">
            <PricelistEditForm initialItems={items} />
          </div>
        </>
      ) : (
        <>
          {!hasAny ? (
            <p className="text-sm text-primary-500 dark:text-primary-400">{t("notSet")}</p>
          ) : (
            <ul className="space-y-3">
              {activeItems.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-950 p-4 flex justify-between items-center"
                >
                  <span className="font-medium text-primary-800 dark:text-primary-100">{item.name || "—"}</span>
                  <span className="text-primary-700 dark:text-primary-200 tabular-nums">
                    {item.price_czk.toLocaleString(locale === "ru" ? "ru-RU" : "cs-CZ")} Kč
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
