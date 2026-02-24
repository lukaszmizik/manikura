import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { routing } from "@/i18n/routing";

export default async function RootPage() {
  const cookieStore = await cookies();
  const locale =
    cookieStore.get("NEXT_LOCALE")?.value ??
    routing.defaultLocale;
  redirect(`/${locale}`);
}
