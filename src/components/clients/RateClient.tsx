"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

export function RateClient({
  clientId,
  currentRating,
}: {
  clientId: string;
  currentRating: number | null;
}) {
  const router = useRouter();
  const t = useTranslations("clients");
  const [hover, setHover] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedRating, setSavedRating] = useState<number | null>(currentRating);

  const value = hover ?? savedRating ?? currentRating ?? 0;

  async function setRating(rating: number) {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError(t("notLoggedIn"));
      setLoading(false);
      return;
    }
    const { error: insertError } = await supabase.from("client_ratings").insert({
      client_id: clientId,
      rating,
      created_by: user.id,
    });
    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSavedRating(rating);
    router.refresh();
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-primary-800 mb-2">{t("ratingSectionTitle")}</h2>
      <p className="text-sm text-primary-600 mb-3">
        {t("ratingSectionHelp")}
      </p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={loading}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setRating(star)}
            className="p-1 rounded focus:ring-2 focus:ring-primary-400 focus:outline-none disabled:opacity-50"
            aria-label={t("ratingAria", { value: star })}
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                star <= value ? "fill-amber-400 text-amber-400" : "text-primary-200"
              }`}
            />
          </button>
        ))}
      </div>
      {(savedRating != null || currentRating != null) && (
        <p className="text-sm text-primary-500 mt-1">
          {t("currentRatingLabel", { value: savedRating ?? currentRating ?? 0 })} ★
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </section>
  );
}
