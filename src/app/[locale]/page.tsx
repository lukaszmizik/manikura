import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicPhotoUrl } from "@/lib/storage";
import { Sparkles, Heart, Calendar } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const supabase = await createClient();
  const { data: publicPhotos } = await supabase
    .from("visit_photos")
    .select("id, storage_path")
    .eq("public", true)
    .limit(12);
  const photos = publicPhotos ?? [];
  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 safe-bottom border-b border-primary-200/50 bg-white/80 backdrop-blur flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-primary-700">{t("title")}</h1>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 p-4 bottom-bar-spacer">
        <section className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 text-primary-600 mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-primary-800 mb-2">{t("heroTitle")}</h2>
          <p className="text-primary-600 max-w-sm mx-auto">{t("heroDesc")}</p>
        </section>

        <section className="space-y-3">
          <Link
            href="/auth/login"
            className="block w-full py-3 px-4 rounded-xl bg-primary-500 text-primary-foreground font-medium text-center shadow-lg shadow-primary-500/25 active:scale-[0.98]"
          >
            {t("login")}
          </Link>
          <Link
            href="/auth/register"
            className="block w-full py-3 px-4 rounded-xl border-2 border-primary-300 text-primary-700 font-medium text-center active:scale-[0.98]"
          >
            {t("register")}
          </Link>
        </section>

        <section className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-semibold text-primary-800">{t("inspiraceTitle")}</h3>
          </div>
          <p className="text-sm text-primary-600 mb-4">{t("inspiraceDesc")}</p>
          <div className="grid grid-cols-3 gap-2">
            {photos.length > 0 ? (
              photos.map((photo) => (
                <Link
                  key={photo.id}
                  href="/inspirace"
                  className="aspect-square rounded-xl overflow-hidden bg-primary-100 block focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
                >
                  <Image
                    src={getPublicPhotoUrl(photo.storage_path)}
                    alt=""
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                    sizes="(max-width: 400px) 33vw, 128px"
                  />
                </Link>
              ))
            ) : (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-primary-100 flex items-center justify-center"
                >
                  <Calendar className="w-8 h-8 text-primary-300" />
                </div>
              ))
            )}
          </div>
          <Link
            href="/inspirace"
            className="mt-3 block text-center text-primary-600 font-medium text-sm"
          >
            {t("showGallery")}
          </Link>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-4 safe-bottom bg-white/90 border-t border-primary-200/50 text-center text-xs text-primary-500">
        {t("footerPwa")}
      </footer>
    </div>
  );
}
