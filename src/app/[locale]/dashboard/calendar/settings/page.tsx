import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Settings, CalendarX } from "lucide-react";
import { RestrictionsSection } from "@/components/calendar/RestrictionsSection";
import { CalendarDisplayRangeForm } from "@/components/calendar/CalendarDisplayRangeForm";
import { DefaultSlotLengthForm } from "@/components/calendar/DefaultSlotLengthForm";
import { AutoApproveBookingsForm } from "@/components/calendar/AutoApproveBookingsForm";
import { SALON_INFO_ID } from "@/lib/salon";

export default async function CalendarSettingsPage() {
  const t = await getTranslations("calendarSettings");
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/auth/login", locale });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (profile?.role !== "admin") redirect({ href: "/dashboard/calendar", locale });

  const today = new Date().toISOString().slice(0, 10);
  // Při otevření nastavení kalendáře automaticky smažeme omezení, jejichž den už uplynul.
  await supabase
    .from("availability_restrictions")
    .delete()
    .lt("restriction_date", today);

  const [{ data: restrictions }, { data: salonRow }] = await Promise.all([
    supabase
      .from("availability_restrictions")
      .select("id, restriction_date, restriction_type, note")
      .gte("restriction_date", today)
      .order("restriction_date"),
    supabase
      .from("salon_info")
      .select("calendar_display_start, calendar_display_end, default_slot_minutes, auto_approve_bookings")
      .eq("id", SALON_INFO_ID)
      .single(),
  ]);

  const displayStart = (salonRow as { calendar_display_start?: string } | null)?.calendar_display_start?.slice(0, 5) ?? "08:00";
  const displayEnd = (salonRow as { calendar_display_end?: string } | null)?.calendar_display_end?.slice(0, 5) ?? "20:00";
  const defaultSlotMinutes = (salonRow as { default_slot_minutes?: number | null } | null)?.default_slot_minutes ?? 120;
  const autoApproveBookings = (salonRow as { auto_approve_bookings?: boolean } | null)?.auto_approve_bookings ?? false;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/calendar"
        className="inline-flex items-center gap-2 text-primary-600 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("backToCalendar")}
      </Link>
      <h2 className="text-xl font-semibold text-primary-800 flex items-center gap-2">
        <Settings className="w-5 h-5" />
        {t("title")}
      </h2>

      <section>
        <h3 className="text-lg font-medium text-primary-800 mb-3">{t("displayRange")}</h3>
        <p className="text-sm text-primary-600 mb-4">
          {t("displayRangeHint")}
        </p>
        <CalendarDisplayRangeForm initialStart={displayStart} initialEnd={displayEnd} />
      </section>

      <section>
        <h3 className="text-lg font-medium text-primary-800 mb-3">{t("defaultSlotLength")}</h3>
        <DefaultSlotLengthForm initialMinutes={defaultSlotMinutes} />
      </section>

      <section>
        <h3 className="text-lg font-medium text-primary-800 mb-3">{t("autoApproveSection")}</h3>
        <AutoApproveBookingsForm initialChecked={autoApproveBookings} />
      </section>

      <section>
        <h3 className="text-lg font-medium text-primary-800 mb-3 flex items-center gap-2">
          <CalendarX className="w-5 h-5" />
          {t("restrictions")}
        </h3>
        <p className="text-sm text-primary-600 mb-4">
          V vybrané dny nebudou k dispozici žádné sloty.
        </p>
        <RestrictionsSection restrictions={restrictions ?? []} />
      </section>
    </div>
  );
}
