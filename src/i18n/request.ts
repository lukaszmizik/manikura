import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { headers } from "next/headers";
import { routing } from "./routing";

const LOCALE_HEADER = "x-next-intl-locale";
const PATHNAME_HEADER = "x-next-intl-pathname";

function localeFromPathname(pathname: string | null): string | null {
  if (!pathname || !pathname.startsWith("/")) return null;
  const segment = pathname.slice(1).split("/")[0];
  return hasLocale(routing.locales, segment) ? segment : null;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const h = await headers();
  const fromPath = localeFromPathname(h.get(PATHNAME_HEADER));
  const fromHeader = h.get(LOCALE_HEADER);
  const fromNextIntl = await requestLocale;
  // requestLocale obsahuje cache z layoutu (setRequestLocale) – v devu hlavičky z middleware nemusí dojít
  const requested = fromPath ?? fromNextIntl ?? fromHeader;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
