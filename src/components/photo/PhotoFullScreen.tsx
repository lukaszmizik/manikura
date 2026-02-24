"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, Heart } from "lucide-react";
import { getPublicPhotoUrl } from "@/lib/storage";
import { useTranslations } from "next-intl";

type Props = {
  photoId: string;
  storagePath: string;
  likeCount: number;
  isLikedByMe: boolean;
};

export function PhotoFullScreen({
  photoId,
  storagePath,
  likeCount: initialLikeCount,
  isLikedByMe: initialLiked,
}: Props) {
  const t = useTranslations("inspirace");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialLikeCount);

  const url = getPublicPhotoUrl(storagePath);

  async function toggleLike() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      router.push("/auth/login?next=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (liked) {
      await supabase.from("photo_likes").delete().eq("photo_id", photoId).eq("user_id", user.id);
      setLiked(false);
      setCount((c) => Math.max(0, c - 1));
    } else {
      const { error } = await supabase.from("photo_likes").insert({
        photo_id: photoId,
        user_id: user.id,
      });
      if (!error) {
        setLiked(true);
        setCount((c) => c + 1);
      }
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Top bar: back + like; safe area for notch/home indicator */}
      <header
        className="flex items-center justify-between p-3 min-h-[48px] shrink-0"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0.75rem))" }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 p-2 -m-2 rounded-full text-white/90 hover:text-white hover:bg-white/10 touch-manipulation"
          aria-label={tCommon("back")}
        >
          <ChevronLeft className="w-6 h-6" />
          <span className="text-sm font-medium">{tCommon("back")}</span>
        </button>
        <button
          type="button"
          onClick={toggleLike}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/50 text-white text-sm font-medium hover:bg-black/70 disabled:opacity-50 touch-manipulation"
          aria-label={liked ? t("ariaUnlike") : t("ariaLike")}
        >
          <Heart
            className={`w-5 h-5 ${liked ? "fill-red-400 text-red-400" : "text-white"}`}
          />
          <span>{count}</span>
        </button>
      </header>

      {/* Image: fills remaining space, object-contain for full image visible */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center p-2">
        <Image
          src={url}
          alt=""
          fill
          className="object-contain select-none"
          sizes="100vw"
          draggable={false}
          style={{ touchAction: "manipulation" }}
        />
      </div>
    </div>
  );
}
