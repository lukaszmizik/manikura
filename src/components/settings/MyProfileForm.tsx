"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updateMyProfile } from "@/app/dashboard/settings/actions";
import { Loader2 } from "lucide-react";

type MyProfileFormProps = {
  initialData: {
    display_name: string | null;
    phone: string | null;
    email: string | null;
    photos_public_by_default: boolean;
  };
};

export function MyProfileForm({ initialData }: MyProfileFormProps) {
  const t = useTranslations("myProfile");
  const tCommon = useTranslations("common");
  const [display_name, setDisplayName] = useState(initialData.display_name ?? "");
  const [phone, setPhone] = useState(initialData.phone ?? "");
  const [photos_public_by_default, setPhotosPublicByDefault] = useState(
    initialData.photos_public_by_default
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    const formData = new FormData();
    formData.set("display_name", display_name.trim());
    formData.set("phone", phone.trim());
    if (photos_public_by_default) formData.set("photos_public_by_default", "on");
    const result = await updateMyProfile(formData);
    setSaving(false);
    if (result.error) setError(result.error);
    else setSuccess(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <label className="block">
        <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
          {t("displayName")}
        </span>
        <input
          type="text"
          name="display_name"
          value={display_name}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t("displayNamePlaceholder")}
          className="mt-1 block w-full rounded-lg border border-primary-200 dark:border-primary-700 px-3 py-2 text-primary-900 dark:text-primary-100 bg-white dark:bg-primary-950"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
          {t("phone")}
        </span>
        <input
          type="tel"
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("phonePlaceholder")}
          className="mt-1 block w-full rounded-lg border border-primary-200 dark:border-primary-700 px-3 py-2 text-primary-900 dark:text-primary-100 bg-white dark:bg-primary-950"
        />
      </label>
      <div className="block">
        <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
          {t("email")}
        </span>
        <p className="mt-1 text-sm text-primary-600 dark:text-primary-400">
          {initialData.email ?? "—"}
        </p>
        <p className="mt-0.5 text-xs text-primary-500 dark:text-primary-500">
          {t("emailReadOnly")}
        </p>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          name="photos_public_by_default"
          checked={photos_public_by_default}
          onChange={(e) => setPhotosPublicByDefault(e.target.checked)}
          className="rounded border-primary-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm text-primary-700 dark:text-primary-300">
          {t("photosPublicByDefault")}
        </span>
      </label>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          {t("saveSuccess")}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {tCommon("loading")}
          </>
        ) : (
          tCommon("save")
        )}
      </button>
    </form>
  );
}
