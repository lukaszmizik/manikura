import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { routing } from "./src/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const LOCALE_COOKIE = "NEXT_LOCALE";
/** Hlavička, ze které next-intl a getRequestConfig čtou lokalizaci (musí sedět s request.ts). */
const LOCALE_HEADER = "x-next-intl-locale";
const PATHNAME_HEADER = "x-next-intl-pathname";

export async function middleware(request: NextRequest) {
  const intlResponse = await intlMiddleware(request);

  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse;
  }

  const pathname = request.nextUrl.pathname;
  const segment = pathname.startsWith("/") ? pathname.slice(1).split("/")[0] : "";
  const localeFromPath =
    routing.locales.includes(segment as "cs" | "ru") ? segment : null;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, pathname);
  if (localeFromPath) {
    requestHeaders.set(LOCALE_HEADER, localeFromPath);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  intlResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });
  const sessionResponse = await updateSession(request);
  sessionResponse.cookies.getAll().forEach((cookie) => {
    if (cookie.name === LOCALE_COOKIE) return;
    response.cookies.set(cookie.name, cookie.value, cookie);
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
