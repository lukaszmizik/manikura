"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Heart } from "lucide-react";
import { getPublicPhotoUrl } from "@/lib/storage";

type PhotoCardProps = {
  id: string;
  storagePath: string;
  likeCount: number;
  isLikedByMe: boolean;
};

export function PhotoCard({ id, storagePath, likeCount, isLikedByMe }: PhotoCardProps) {
  const router = useRouter();
  const t = useTranslations("inspirace");
  const [loading, setLoading] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState(isLikedByMe);
  const [optimisticCount, setOptimisticCount] = useState(likeCount);

  const liked = optimisticLiked;
  const count = optimisticCount;

  async function toggleLike() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login?next=/inspirace");
      setLoading(false);
      return;
    }
    if (liked) {
      await supabase.from("photo_likes").delete().eq("photo_id", id).eq("user_id", user.id);
      setOptimisticLiked(false);
      setOptimisticCount((c) => Math.max(0, c - 1));
    } else {
      const { error } = await supabase.from("photo_likes").insert({
        photo_id: id,
        user_id: user.id,
      });
      if (error) {
        if (error.code === "23505") {
          setOptimisticLiked(true);
          setOptimisticCount((c) => c + 1);
        }
      } else {
        setOptimisticLiked(true);
        setOptimisticCount((c) => c + 1);
      }
    }
    setLoading(false);
    router.refresh();
  }

  const url = getPublicPhotoUrl(storagePath);

  return (
    <div className="relative group aspect-square rounded-xl overflow-hidden bg-primary-100 border border-primary-200">
      <Link
        href={`/photo/${id}`}
        className="block w-full h-full"
      >
        <Image
          src={url}
          alt="Inspirace z manikúry"
          width={400}
          height={400}
          className="w-full h-full object-cover"
          sizes="(max-width: 640px) 50vw, 33vw"
        />
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          if (!loading) toggleLike();
        }}
        disabled={loading}
        className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-black/50 text-white text-sm font-medium hover:bg-black/70 disabled:opacity-50"
        aria-label={liked ? t("ariaUnlike") : t("ariaLike")}
      >
        <Heart
          className={`w-4 h-4 ${liked ? "fill-red-400 text-red-400" : "text-white"}`}
        />
        <span>{count}</span>
      </button>
    </div>
  );
}
