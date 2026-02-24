"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getPublicPhotoUrl } from "@/lib/storage";
import { PhotoUpload } from "@/components/ui/PhotoUpload";
import { CalendarPlus, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

const BUCKET = "visit-photos";

type VisitOption = { id: string; dateLabel: string };

export function NewVisitSection({
  clientId,
  visitOptions,
  hideTitle,
}: {
  clientId: string;
  visitOptions: VisitOption[];
  /** Skrýt vlastní nadpis (např. když je sekce vložená do „Nahrání fotografie“). */
  hideTitle?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("clients");
  const [visitId, setVisitId] = useState<string | null>(null);
  const [visitDateLabel, setVisitDateLabel] = useState<string>("");
  const [newDate, setNewDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [newTime, setNewTime] = useState("10:00");
  const [newNote, setNewNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recentPhotos, setRecentPhotos] = useState<{ path: string; id: string }[]>([]);

  const createVisit = useCallback(async () => {
    setCreating(true);
    setUploadError(null);
    const supabase = createClient();
    const timePart = newTime.length === 5 ? newTime + ":00" : newTime;
    const startAt = new Date(newDate + "T" + timePart);
    const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000);
    const { data: apt, error: aptErr } = await supabase
      .from("appointments")
      .insert({
        client_id: clientId,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        status: "completed",
      })
      .select("id")
      .single();
    if (aptErr || !apt) {
      setUploadError(aptErr?.message ?? t("createVisitErrorAppointment"));
      setCreating(false);
      return;
    }
    const { data: visit, error: visitErr } = await supabase
      .from("visits")
      .insert({
        appointment_id: apt.id,
        client_id: clientId,
        notes: newNote.trim() || null,
      })
      .select("id")
      .single();
    if (visitErr || !visit) {
      setUploadError(visitErr?.message ?? t("createVisitErrorVisit"));
      setCreating(false);
      return;
    }
    setVisitId(visit.id);
    setVisitDateLabel(
      startAt.toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    setRecentPhotos([]);
    setCreating(false);
    router.refresh();
  }, [clientId, newDate, newTime, newNote, router, t]);

  const handlePhotosReady = useCallback(
    async (compressedFiles: File[]) => {
      if (!compressedFiles.length || !visitId) return;
      setUploading(true);
      setUploadError(null);
      const supabase = createClient();
      const added: { path: string; id: string }[] = [];

      try {
        for (const file of compressedFiles) {
          const ext = file.type === "image/png" ? "png" : "jpg";
          const path = `${clientId}/${visitId}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, {
              contentType: file.type,
              upsert: false,
            });
          if (upErr) {
            setUploadError(upErr.message);
            break;
          }
          const { data: row, error: insErr } = await supabase
            .from("visit_photos")
            .insert({
              visit_id: visitId,
              client_id: clientId,
              storage_path: path,
              public: false,
            })
            .select("id")
            .single();
          if (insErr) {
            setUploadError(insErr.message);
            break;
          }
          added.push({ path, id: row.id });
        }
        setRecentPhotos((prev) => [...added, ...prev]);
        router.refresh();
      } finally {
        setUploading(false);
      }
    },
    [clientId, visitId, router]
  );

  return (
    <section className={hideTitle ? "" : "rounded-xl border border-primary-200 bg-white p-4 shadow-sm"}>
      {hideTitle ? (
        // Režim pro nahrávání fotek: jen seznam návštěv + upload po kliknutí
        <>
          {!visitId ? (
            <div className="space-y-3">
              {visitOptions.length === 0 ? (
                <p className="text-sm text-primary-500">
                  {t("noVisitsYet")}
                </p>
              ) : (
                <ul className="space-y-1">
                  {visitOptions.map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setVisitId(v.id);
                          setVisitDateLabel(v.dateLabel);
                          setRecentPhotos([]);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg border border-primary-200 hover:bg-primary-50 text-sm text-primary-700"
                      >
                        {v.dateLabel}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-primary-600">
                {t("photoUploadVisitLabel", { date: visitDateLabel })}
              </p>
              <PhotoUpload
                onFilesReady={handlePhotosReady}
                onError={setUploadError}
                disabled={uploading}
                label={t("photoUploadInputLabel")}
                compressingLabel={t("photoUploadCompressing")}
              />
              {uploading && (
                <p className="text-sm text-primary-600">{t("photoUploading")}</p>
              )}
              {uploadError && (
                <p className="text-sm text-red-600">{uploadError}</p>
              )}
              {recentPhotos.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-primary-800 mb-2">
                    {t("photoUploadRecent")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recentPhotos.map(({ path }) => (
                      <a
                        key={path}
                        href={getPublicPhotoUrl(path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-20 h-20 rounded-lg overflow-hidden border border-primary-200 bg-primary-100"
                      >
                        <Image
                          src={getPublicPhotoUrl(path)}
                          alt={t("photoUploadRecentAlt")}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setVisitId(null);
                  setVisitDateLabel("");
                  setRecentPhotos([]);
                }}
                className="text-sm text-primary-600 hover:underline"
              >
                {t("photoUploadChooseAnother")}
              </button>
            </div>
          )}
        </>
      ) : (
        // Plný režim: vytvoření nové návštěvy (bez textu o fotkách)
        <>
          <h2 className="text-lg font-semibold text-primary-800 mb-4 flex items-center gap-2">
            <CalendarPlus className="w-5 h-5" />
            {t("newVisitTitle")}
          </h2>

          {!visitId ? (
            <div className="space-y-4">
              <p className="text-sm text-primary-600">
                {t("newVisitDesc")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-primary-800">
                    {t("newVisitDateLabel")}
                  </span>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-primary-200 px-3 py-2 text-primary-900"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-primary-800">
                    {t("newVisitTimeLabel")}
                  </span>
                  <input
                    type="time"
                    step={900}
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-primary-200 px-3 py-2 text-primary-900"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-primary-800">
                    {t("newVisitNoteLabel")}
                  </span>
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder={t("newVisitNotePlaceholder")}
                    className="mt-1 block w-full rounded-lg border border-primary-200 px-3 py-2 text-primary-900"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={createVisit}
                disabled={creating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white font-medium disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("newVisitCreating")}
                  </>
                ) : (
                  t("newVisitCreateButton")
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-primary-600">
                {t("newVisitCreatedLabel", { date: visitDateLabel })}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
