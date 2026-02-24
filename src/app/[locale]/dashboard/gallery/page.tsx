import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PhotoCard } from "@/components/inspirace/PhotoCard";

type Props = { params: Promise<{ locale: string }> };

export default async function ClientGalleryPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "inspirace" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: photos } = await supabase
    .from("visit_photos")
    .select("id, storage_path")
    .eq("public", true);

  if (!photos?.length) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-primary-800 dark:text-primary-100">
          {t("title")}
        </h2>
        <p className="text-sm text-primary-600 dark:text-primary-400">
          {t("descEmpty")}
        </p>
        <p className="text-primary-500 dark:text-primary-400 py-4 text-center text-sm">
          {t("noPhotos")}
        </p>
      </div>
    );
  }

  const photoIds = photos.map((p) => p.id);
  const { data: likes } = await supabase
    .from("photo_likes")
    .select("photo_id, user_id")
    .in("photo_id", photoIds);

  const likeCountByPhoto: Record<string, number> = {};
  photoIds.forEach((id) => (likeCountByPhoto[id] = 0));
  likes?.forEach((l) => {
    likeCountByPhoto[l.photo_id] = (likeCountByPhoto[l.photo_id] ?? 0) + 1;
  });

  const myLikedIds = new Set(
    user ? likes?.filter((l) => l.user_id === user.id).map((l) => l.photo_id) ?? [] : []
  );

  const sorted = [...photos].sort(
    (a, b) => (likeCountByPhoto[b.id] ?? 0) - (likeCountByPhoto[a.id] ?? 0)
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-primary-800 dark:text-primary-100">
          {t("title")}
        </h2>
        <p className="text-sm text-primary-600 dark:text-primary-400">
          {t("desc")}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {sorted.map((photo) => (
          <PhotoCard
            key={photo.id}
            id={photo.id}
            storagePath={photo.storage_path}
            likeCount={likeCountByPhoto[photo.id] ?? 0}
            isLikedByMe={myLikedIds.has(photo.id)}
          />
        ))}
      </div>
    </div>
  );
}

