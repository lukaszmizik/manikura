"use client";

import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { useMemo } from "react";

const localeNames: Record<string, string> = {
  cs: "Česky",
  ru: "Русский",
};

const LOCALES = ["cs", "ru"] as const;

/**
 * next-intl vrací pathname BEZ prefixu lokálu (např. "/dashboard" i na /ru/dashboard).
 * Pro přepnutí jazyka přejdeme na /ru/dashboard – plná navigace je spolehlivější než router.replace.
 */
function getPathWithoutLocale(pathname: string): string {
  for (const loc of LOCALES) {
    const prefix = `/${loc}`;
    if (pathname === prefix) return "/";
    if (pathname.startsWith(prefix + "/")) return pathname.slice(prefix.length) || "/";
  }
  return pathname;
}

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const pathWithoutLocalePrefix = useMemo(
    () => getPathWithoutLocale(pathname ?? "/"),
    [pathname]
  );

  function switchTo(nextLocale: string) {
    if (nextLocale === locale) return;
    const newPath =
      pathWithoutLocalePrefix === "/"
        ? `/${nextLocale}`
        : `/${nextLocale}${pathWithoutLocalePrefix}`;
    window.location.href = newPath;
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-primary-200 dark:border-primary-700 overflow-hidden">
      {(Object.keys(localeNames) as Array<keyof typeof localeNames>).map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchTo(loc)}
          className={`px-2 py-1.5 text-xs font-medium transition-colors ${
            locale === loc
              ? "bg-primary-500 text-white dark:bg-primary-600"
              : "bg-white dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-800/50"
          }`}
        >
          {localeNames[loc]}
        </button>
      ))}
    </div>
  );
}
