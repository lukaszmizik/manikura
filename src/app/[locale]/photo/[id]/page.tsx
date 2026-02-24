import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PhotoFullScreen } from "@/components/photo/PhotoFullScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function PhotoPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: photo } = await supabase
    .from("visit_photos")
    .select("id, storage_path")
    .eq("id", id)
    .eq("public", true)
    .single();

  if (!photo) notFound();

  const { data: likes } = await supabase
    .from("photo_likes")
    .select("user_id")
    .eq("photo_id", id);

  const likeCount = likes?.length ?? 0;
  const isLikedByMe = Boolean(user && likes?.some((l) => l.user_id === user.id));

  return (
    <PhotoFullScreen
      photoId={photo.id}
      storagePath={photo.storage_path}
      likeCount={likeCount}
      isLikedByMe={isLikedByMe}
    />
  );
}
