import { redirect } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string }>;
};

/** Přesměrování: den → stejná stránka rezervace (book) s datem. */
export default async function CalendarDayPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { date: dateParam } = await searchParams;
  const dateStr = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : new Date().toISOString().slice(0, 10);
  redirect({ href: `/dashboard/calendar/book?date=${dateStr}`, locale });
}
