"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import type { FreeSlot } from "@/lib/slots";
import { createGuestBookingWithMagicLink } from "@/app/dashboard/calendar/actions";

type Props = {
  locale: string;
  selectedDate: string;
  minDate: string;
  slots: FreeSlot[];
  localeStr: string;
  displayStart: string;
  displayEnd: string;
};

export function GuestBookingForm({
  locale,
  selectedDate,
  minDate,
  slots,
  localeStr,
  displayStart,
  displayEnd,
}: Props) {
  const t = useTranslations("guestBooking");
  const tCommon = useTranslations("common");
  const tCal = useTranslations("calendar");
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dateLabel = new Date(selectedDate + "T12:00:00").toLocaleDateString(localeStr, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const selectedSlot = slots.find(
    (s) => `${s.appointmentId ?? "new"}-${s.start}-${s.end}` === selectedSlotKey
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedSlot) {
      setError(t("errorNoSlot"));
      return;
    }
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed || !emailTrimmed.includes("@")) {
      setError(t("errorEmail"));
      return;
    }
    setLoading(true);
    const res = await createGuestBookingWithMagicLink({
      email: emailTrimmed,
      displayName: name.trim() || null,
      date: selectedDate,
      startTime: selectedSlot.start,
      endTime: selectedSlot.end,
      isLastMinute: selectedSlot.isLastMinute,
      lastMinutePrice: selectedSlot.priceCzk,
      appointmentId: selectedSlot.appointmentId ?? null,
    });
    if (res.error) {
      setLoading(false);
      setError(res.error);
      return;
    }

    // Poslat magic link přes Supabase Auth (bez hesla).
    const nextPath = `/dashboard/calendar/terms`;
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: emailTrimmed,
      options: {
        // Magic link povede na /auth/callback, která po výměně kódu za session
        // přesměruje na přehled termínů.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="font-semibold">{t("successTitle")}</p>
        <p>{t("successDesc", { email })}</p>
        <p className="text-xs text-emerald-700 mt-2">
          {t("successHint")}
        </p>
      </div>
    );
  }

  const visibleSlots = slots.filter((slot) => {
    // Zobrazit jen sloty v rámci pracovního rozsahu dne.
    const [startH] = slot.start.split(":").map(Number);
    const [endH] = slot.end.split(":").map(Number);
    const [dispStartH] = displayStart.split(":").map(Number);
    const [dispEndH] = displayEnd.split(":").map(Number);
    return startH >= dispStartH && endH <= dispEndH;
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-100 text-red-800 text-sm">{error}</div>
      )}

      <div className="space-y-2 rounded-xl border border-primary-200 bg-primary-50/40 p-3">
        <h2 className="text-sm font-semibold text-primary-800">
          {t("sectionContact")}
        </h2>
        <label className="block">
          <span className="text-sm font-medium text-primary-800">{t("nameLabel")}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-primary-200 px-3 py-2 text-primary-900"
            placeholder={t("namePlaceholder")}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-primary-800">{t("emailLabel")}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-primary-200 px-3 py-2 text-primary-900"
            placeholder={t("emailPlaceholder")}
          />
        </label>
      </div>

      <div className="space-y-2 rounded-xl border border-primary-200 bg-white p-3">
        <h2 className="text-sm font-semibold text-primary-800">
          {t("sectionTime")}
        </h2>
        {visibleSlots.length === 0 ? (
          <p className="text-sm text-primary-500">{tCal("noSlotsForDay")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {visibleSlots.map((slot) => {
              const key = `${slot.appointmentId ?? "new"}-${slot.start}-${slot.end}`;
              const isSelected = selectedSlotKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedSlotKey(key)}
                  className={`py-3 px-4 rounded-xl border-2 text-left font-medium ${
                    isSelected
                      ? "border-primary-500 bg-primary-100 text-primary-800"
                      : slot.isLastMinute
                        ? "border-amber-400 bg-amber-50 text-amber-900 hover:border-amber-500 dark:bg-amber-900/30 dark:text-amber-100 dark:border-amber-600"
                        : "border-sky-300 bg-sky-50 text-sky-900 hover:border-sky-400 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-100 dark:hover:bg-sky-900/60"
                  }`}
                >
                  <span>
                    {slot.start} – {slot.end}
                  </span>
                  {slot.isLastMinute && slot.priceCzk != null && (
                    <span className="block text-sm font-normal text-amber-700 dark:text-amber-300">
                      {slot.priceCzk} Kč ({tCal("lastMinute")})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-primary-500 text-white font-medium disabled:opacity-50 hover:bg-primary-600"
      >
        {loading ? t("submitting") : t("submit")}
      </button>

      <p className="text-xs text-primary-500">
        {t("magicLinkHint")}
      </p>
    </form>
  );
}

