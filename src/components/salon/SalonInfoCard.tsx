"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  MapPin,
  Phone,
  Mail,
  Building2,
  CreditCard,
  QrCode,
  Send,
  MessageCircle,
  Instagram,
  Facebook,
  Music2,
} from "lucide-react";
import { googleMapsUrl } from "@/lib/salon";

export type SalonInfo = {
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  bank_account: string | null;
  iban: string | null;
  qr_code_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
};

type SalonInfoCardProps = {
  info: SalonInfo | null;
};

export function SalonInfoCard({ info }: SalonInfoCardProps) {
  const t = useTranslations("salon");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!info) return null;

  const hasContact = info.name || info.address || info.phone || info.email;
  const hasSocial =
    (info.instagram_url && info.instagram_url.trim() !== "") ||
    (info.facebook_url && info.facebook_url.trim() !== "") ||
    (info.tiktok_url && info.tiktok_url.trim() !== "");
  const hasPayment = info.bank_account || info.iban;
  const hasAny = hasContact || hasPayment || info.qr_code_url || hasSocial;

  if (!hasAny) return null;

  return (
    <>
      <article className="rounded-2xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-primary-950 overflow-hidden shadow-sm">
        <div className="p-4 space-y-4">
          {info.name && (
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/50">
                <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-primary-800 dark:text-primary-100">{info.name}</h3>
            </div>
          )}

          {info.address && (
            <a
              href={googleMapsUrl(info.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-xl bg-primary-50/50 dark:bg-primary-900/30 hover:bg-primary-100/50 dark:hover:bg-primary-800/30 transition-colors group"
            >
              <MapPin className="h-5 w-5 text-primary-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-primary-800 dark:text-primary-200 text-sm leading-snug">{info.address}</p>
                <span className="text-xs font-medium text-primary-500 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                  {t("openInMaps")} →
                </span>
              </div>
            </a>
          )}

          <div className="flex flex-col gap-2">
            {info.phone && (
              <a
                href={`tel:${info.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-3 text-primary-700 dark:text-primary-300 hover:text-primary-600 dark:hover:text-primary-200"
              >
                <Phone className="h-5 w-5 text-primary-500 shrink-0" />
                <span className="text-sm">{info.phone}</span>
              </a>
            )}
            {info.email && (
              <a
                href={`mailto:${info.email}`}
                className="flex items-center gap-3 text-primary-700 dark:text-primary-300 hover:text-primary-600 dark:hover:text-primary-200"
              >
                <Mail className="h-5 w-5 text-primary-500 shrink-0" />
                <span className="text-sm break-all">{info.email}</span>
              </a>
            )}
          </div>

          {info.phone && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-medium text-primary-500 dark:text-primary-400">
                {t("messengers")}
              </span>
              <div className="flex items-center gap-2">
                {(() => {
                  const raw = info.phone ?? "";
                  const normalized = raw.replace(/\s/g, "");
                  const waNumber = normalized.replace(/^\+/, "");
                  return (
                    <>
                      <a
                        href={`https://t.me/${encodeURIComponent(waNumber || normalized)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 text-sky-500 hover:bg-sky-500/20"
                        aria-label={t("ariaTelegram")}
                      >
                        <Send className="h-4 w-4" />
                      </a>
                      <a
                        href={`viber://chat?number=${encodeURIComponent(normalized)}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10 text-purple-500 hover:bg-purple-500/20"
                        aria-label={t("ariaViber")}
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                      <a
                        href={`https://wa.me/${encodeURIComponent(waNumber)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                        aria-label={t("ariaWhatsApp")}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {hasSocial && (
            <div className="pt-2">
              <div className="flex items-center gap-3">
                {info.instagram_url && info.instagram_url.trim() && (
                  <a
                    href={
                      info.instagram_url.startsWith("http")
                        ? info.instagram_url
                        : `https://instagram.com/${info.instagram_url.replace(/^@/, "")}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary-700 dark:text-primary-300 hover:text-primary-600 dark:hover:text-primary-200"
                  >
                    <Instagram className="h-4 w-4" />
                    <span className="truncate max-w-[8rem]">
                      {info.instagram_url.replace(/^https?:\/\//, "")}
                    </span>
                  </a>
                )}
                {info.facebook_url && info.facebook_url.trim() && (
                  <a
                    href={
                      info.facebook_url.startsWith("http")
                        ? info.facebook_url
                        : `https://facebook.com/${info.facebook_url.replace(/^@/, "")}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary-700 dark:text-primary-300 hover:text-primary-600 dark:hover:text-primary-200"
                  >
                    <Facebook className="h-4 w-4" />
                    <span className="truncate max-w-[8rem]">
                      {info.facebook_url.replace(/^https?:\/\//, "")}
                    </span>
                  </a>
                )}
                {info.tiktok_url && info.tiktok_url.trim() && (
                  <a
                    href={
                      info.tiktok_url.startsWith("http")
                        ? info.tiktok_url
                        : `https://tiktok.com/@${info.tiktok_url.replace(/^@/, "")}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary-700 dark:text-primary-300 hover:text-primary-600 dark:hover:text-primary-200"
                  >
                    <Music2 className="h-4 w-4" />
                    <span className="truncate max-w-[8rem]">
                      {info.tiktok_url.replace(/^https?:\/\//, "")}
                    </span>
                  </a>
                )}
              </div>
            </div>
          )}

          {hasPayment && (
            <div className="pt-3 border-t border-primary-100 dark:border-primary-800">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-primary-700 dark:text-primary-300 mb-2">
                <CreditCard className="h-4 w-4" />
                {t("paymentInstructions")}
              </h4>
              <div className="space-y-1.5 text-sm text-primary-600 dark:text-primary-400 font-mono bg-primary-50 dark:bg-primary-900/30 rounded-lg p-3">
                {info.bank_account && (
                  <p>
                    <span className="text-primary-500 dark:text-primary-500 text-xs font-sans">{t("bankAccount")}: </span>
                    {info.bank_account}
                  </p>
                )}
                {info.iban && (
                  <p className="break-all">
                    <span className="text-primary-500 dark:text-primary-500 text-xs font-sans">{t("iban")}: </span>
                    {info.iban}
                  </p>
                )}
              </div>
            </div>
          )}

          {info.qr_code_url && (
            <div className="pt-3 border-t border-primary-100 dark:border-primary-800">
              <p className="flex items-center gap-2 text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                <QrCode className="h-4 w-4" />
                {t("qrCode")}
              </p>
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="block rounded-xl border border-primary-200 dark:border-primary-700 overflow-hidden hover:opacity-90 focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 dark:focus:ring-offset-primary-950"
                aria-label={t("ariaEnlargeQr")}
              >
                <Image
                  src={info.qr_code_url}
                  alt="QR kód pro platbu"
                  width={128}
                  height={128}
                  className="w-32 h-32 object-contain bg-white dark:bg-primary-900"
                />
              </button>
              <p className="text-xs text-primary-500 mt-1">{t("qrClickToEnlarge")}</p>
            </div>
          )}
        </div>
      </article>

      {lightboxOpen && info.qr_code_url && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxOpen(false)}
          aria-label={t("ariaClose")}
        >
          <span className="relative block max-w-full max-h-full w-[min(90vw,400px)] h-[min(90vh,400px)]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={info.qr_code_url}
              alt="QR kód pro platbu"
              fill
              className="object-contain rounded-lg shadow-2xl"
              sizes="90vw"
            />
          </span>
        </button>
      )}
    </>
  );
}
