"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { getSalonAssetUrl } from "@/lib/storage";
import { updateSalonInfo, setSalonQrUrl, type SalonInfoRow } from "@/app/dashboard/admin/settings/actions";
import { Loader2, ImagePlus, X } from "lucide-react";

const SALON_BUCKET = "salon-assets";
const QR_PATH = "qr-code";

type SalonSettingsFormProps = {
  initialData: SalonInfoRow | null;
};

export function SalonSettingsForm({ initialData }: SalonSettingsFormProps) {
  const t = useTranslations("salon");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(initialData?.name ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [instagram, setInstagram] = useState(initialData?.instagram_url ?? "");
  const [facebook, setFacebook] = useState(initialData?.facebook_url ?? "");
  const [tiktok, setTiktok] = useState(initialData?.tiktok_url ?? "");
  const [bank_account, setBankAccount] = useState(initialData?.bank_account ?? "");
  const [iban, setIban] = useState(initialData?.iban ?? "");
  const [defaultPriceCzk, setDefaultPriceCzk] = useState(
    initialData?.default_price_czk != null ? String(initialData.default_price_czk) : ""
  );
  const [lastMinuteDiscountPercent, setLastMinuteDiscountPercent] = useState(
    initialData?.last_minute_discount_percent != null ? String(initialData.last_minute_discount_percent) : ""
  );
  const [qrCodeUrl, setQrCodeUrlState] = useState<string | null>(initialData?.qr_code_url ?? null);
  const [saving, setSaving] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("address", address);
    formData.set("phone", phone);
    formData.set("email", email);
    formData.set("instagram", instagram);
    formData.set("facebook", facebook);
    formData.set("tiktok", tiktok);
    formData.set("bank_account", bank_account);
    formData.set("iban", iban);
    formData.set("default_price_czk", defaultPriceCzk);
    formData.set("last_minute_discount_percent", lastMinuteDiscountPercent);
    const result = await updateSalonInfo(formData);
    setSaving(false);
    if (result.error) setError(result.error);
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setError(null);
    setUploadingQr(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${QR_PATH}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(SALON_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadErr) {
      setError(uploadErr.message);
      setUploadingQr(false);
      e.target.value = "";
      return;
    }
    const publicUrl = getSalonAssetUrl(path);
    const res = await setSalonQrUrl(publicUrl);
    if (res.error) setError(res.error);
    else setQrCodeUrlState(publicUrl);
    setUploadingQr(false);
    e.target.value = "";
  };

  const handleRemoveQr = async () => {
    setError(null);
    const res = await setSalonQrUrl(null);
    if (res.error) setError(res.error);
    else setQrCodeUrlState(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-primary-950 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-primary-800 dark:text-primary-100">{t("contact")}</h3>
        <div>
          <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">{t("name")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2"
            placeholder={t("namePlaceholder")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">{t("address")}</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2"
            placeholder={t("addressPlaceholder")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">{t("phone")}</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">{t("email")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-xs font-medium text-primary-700 dark:text-primary-300 mb-1">
              {t("instagram")}
            </label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2 text-xs"
              placeholder={t("instagramPlaceholder")}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-primary-700 dark:text-primary-300 mb-1">
              {t("facebook")}
            </label>
            <input
              type="text"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2 text-xs"
              placeholder={t("facebookPlaceholder")}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-primary-700 dark:text-primary-300 mb-1">
              {t("tiktok")}
            </label>
            <input
              type="text"
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2 text-xs"
              placeholder={t("tiktokPlaceholder")}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-primary-950 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-primary-800 dark:text-primary-100">{t("paymentDetails")}</h3>
        <div>
          <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">{t("bankAccount")}</label>
          <input
            type="text"
            value={bank_account}
            onChange={(e) => setBankAccount(e.target.value)}
            className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2 font-mono text-sm"
            placeholder={t("bankAccountPlaceholder")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">{t("iban")}</label>
          <input
            type="text"
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2 font-mono text-sm"
            placeholder={t("ibanPlaceholder")}
          />
        </div>
      </section>

      <section className="rounded-xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-primary-950 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-primary-800 dark:text-primary-100">{t("qrCode")}</h3>
        {qrCodeUrl ? (
          <div className="flex items-center gap-4">
            <Image
              src={qrCodeUrl}
              alt="QR kód banky"
              width={96}
              height={96}
              className="w-24 h-24 object-contain rounded-lg border border-primary-200 dark:border-primary-700"
            />
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-primary-200 dark:border-primary-700 cursor-pointer text-sm font-medium text-primary-700 dark:text-primary-300">
                <ImagePlus className="w-4 h-4" />
                {t("uploadQr")}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleQrUpload}
                  disabled={uploadingQr}
                />
              </label>
              <button
                type="button"
                onClick={handleRemoveQr}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm"
              >
                <X className="w-4 h-4" />
                {t("removeQr")}
              </button>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-primary-200 dark:border-primary-700 cursor-pointer hover:border-primary-400">
            {uploadingQr ? (
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            ) : (
              <ImagePlus className="w-8 h-8 text-primary-500" />
            )}
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              {uploadingQr ? "Nahrávám…" : t("uploadQr")}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleQrUpload}
              disabled={uploadingQr}
            />
          </label>
        )}
      </section>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 rounded-xl bg-primary-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
        {tCommon("save")}
      </button>
    </form>
  );
}
