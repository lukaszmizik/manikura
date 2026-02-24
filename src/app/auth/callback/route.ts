import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { routing } from "@/i18n/routing";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const cookieStore = await cookies();
  const locale =
    cookieStore.get("NEXT_LOCALE")?.value ??
    (request.headers.get("accept-language")?.startsWith("ru") ? "ru" : null) ??
    routing.defaultLocale;

  const path = next.startsWith("/") ? next : `/${next}`;
  const redirectUrl = `${origin}/${locale}${path}`;
  const loginUrl = `${origin}/${locale}/auth/login?error=auth`;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          email: data.user.email ?? undefined,
          display_name: data.user.user_metadata?.display_name ?? data.user.user_metadata?.full_name ?? data.user.email?.split("@")[0] ?? null,
          role: "client",
        },
        { onConflict: "id" }
      );
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.redirect(loginUrl);
}
