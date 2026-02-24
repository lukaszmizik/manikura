import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Image as ImageIcon } from "lucide-react";
import { PhotoPublicToggle } from "@/components/my-photos/PhotoPublicToggle";
import { MyPhotosUpload } from "@/components/my-photos/MyPhotosUpload";

type Props = { params: Promise<{ locale: string }> };

export default async function MyPhotosPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "myPhotos" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: photos } = await supabase
    .from("visit_photos")
    .select("id, storage_path, public, created_at")
    .eq("client_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100">{t("title")}</h2>
      <p className="text-sm text-primary-600 dark:text-primary-400">{t("desc")}</p>

      <MyPhotosUpload />

      {!photos?.length ? (
        <div className="flex flex-col items-center gap-2 py-8 text-primary-500 dark:text-primary-400">
          <ImageIcon className="w-12 h-12" aria-hidden />
          <p className="text-sm">{t("noPhotos")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((p) => (
            <PhotoPublicToggle
              key={p.id}
              id={p.id}
              storagePath={p.storage_path}
              public={p.public}
            />
          ))}
        </div>
      )}
    </div>
  );
}
