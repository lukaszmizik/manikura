"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PhotoUpload } from "@/components/ui/PhotoUpload";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

const BUCKET = "visit-photos";

export function MyPhotosUpload() {
  const t = useTranslations("myPhotos");
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesReady = useCallback(
    async (compressedFiles: File[]) => {
      if (!compressedFiles.length) return;
      setUploading(true);
      setError(null);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError(t("uploadErrorNotLoggedIn"));
        setUploading(false);
        return;
      }

      try {
        for (const file of compressedFiles) {
          const ext = file.type === "image/png" ? "png" : "jpg";
          const path = `${user.id}/gallery/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, {
              contentType: file.type,
              upsert: false,
            });
          if (upErr) {
            setError(upErr.message);
            break;
          }
          const { error: insErr } = await supabase.from("visit_photos").insert({
            client_id: user.id,
            visit_id: null,
            storage_path: path,
            public: false,
          });
          if (insErr) {
            setError(insErr.message);
            break;
          }
        }
        router.refresh();
      } finally {
        setUploading(false);
      }
    },
    [router, t]
  );

  return (
    <div className="space-y-2">
      <PhotoUpload
        onFilesReady={handleFilesReady}
        onError={setError}
        disabled={uploading}
        label={t("uploadLabel")}
        compressingLabel={t("uploadCompressing")}
      />
      {uploading && (
        <p className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          {t("uploading")}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
