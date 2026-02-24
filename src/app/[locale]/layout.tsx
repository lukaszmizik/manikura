import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ToasterProvider, Toaster } from "@/components/ui/toaster";
import { PwaRegister } from "@/components/PwaRegister";
import { PwaCacheClear } from "@/components/PwaCacheClear";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { HtmlLang } from "@/components/HtmlLang";

/** Vynucení dynamického vykreslování – lokalizace se bere z každého požadavku, ne z cache. */
export const dynamic = "force-dynamic";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const messages = (await import(`../../../messages/${locale}.json`)).default;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLang locale={locale} />
      <ThemeScript />
      <ThemeProvider>
        <ToasterProvider>
          <PwaRegister />
          {process.env.NODE_ENV === "development" && <PwaCacheClear />}
          <div key={locale} className="mx-auto w-full max-w-[430px] min-h-screen bg-white dark:bg-primary-950 shadow-[0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-none md:min-h-[640px] md:my-4 md:rounded-[2rem] md:overflow-hidden md:shadow-xl dark:md:border dark:md:border-primary-900">
            {children}
          </div>
          <Toaster />
        </ToasterProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
