"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import type { ClientOption } from "./AdminCalendarGrid";

type ExistingAppointment = { start_at: string; end_at: string };

type NewReservationModalProps = {
  initialDate: string;
  initialTime: string;
  clients: ClientOption[];
  defaultSlotMinutes?: number;
  existingOnDay?: ExistingAppointment[];
  onSave: (
    clientId: string | null,
    startAtIso: string,
    endAtIso: string,
    note: string | null
  ) => Promise<string | null>;
  onClose: () => void;
};

function intervalsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

export function NewReservationModal({
  initialDate,
  initialTime,
  clients,
  defaultSlotMinutes = 120,
  existingOnDay = [],
  onSave,
  onClose,
}: NewReservationModalProps) {
  const t = useTranslations("calendar");
  const tCommon = useTranslations("common");
  const [clientId, setClientId] = useState("");
  const [startTime, setStartTime] = useState(initialTime);
  const [endTime, setEndTime] = useState(() => {
    const [h, m] = initialTime.split(":").map(Number);
    const totalM = (h ?? 0) * 60 + (m ?? 0) + defaultSlotMinutes;
    const endH = Math.floor(totalM / 60) % 24;
    const endMin = totalM % 60;
    return `${String(endH).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;
  });
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOverlap, setConfirmOverlap] = useState<{
    clientId: string | null;
    startAtIso: string;
    endAtIso: string;
    note: string | null;
  } | null>(null);

  const startAt = new Date(`${initialDate}T${startTime}`);
  const endAt = new Date(`${initialDate}T${endTime}`);
  const timeValid = endAt.getTime() > startAt.getTime();

  const hasOverlap = timeValid && existingOnDay.some((apt) =>
    intervalsOverlap(
      startAt,
      endAt,
      new Date(apt.start_at),
      new Date(apt.end_at)
    )
  );

  const doSave = async (
    clientIdOrNull: string | null,
    startAtIso: string,
    endAtIso: string,
    noteOrNull: string | null
  ) => {
    setError(null);
    setSaving(true);
    const err = await onSave(clientIdOrNull, startAtIso, endAtIso, noteOrNull);
    setSaving(false);
    if (err) setError(err);
    else setConfirmOverlap(null);
  };

  const handleAddVolnoSlot = async () => {
    setError(null);
    setConfirmOverlap(null);
    if (!timeValid) {
      setError("Čas konce musí být po čase začátku.");
      return;
    }
    if (hasOverlap) {
      setConfirmOverlap({
        clientId: null,
        startAtIso: startAt.toISOString(),
        endAtIso: endAt.toISOString(),
        note: note.trim() || null,
      });
      return;
    }
    await doSave(null, startAt.toISOString(), endAt.toISOString(), note.trim() || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfirmOverlap(null);
    if (!clientId.trim()) {
      setError(t("chooseClient"));
      return;
    }
    if (!timeValid) {
      setError("Čas konce musí být po čase začátku.");
      return;
    }
    if (hasOverlap) {
      setConfirmOverlap({
        clientId,
        startAtIso: startAt.toISOString(),
        endAtIso: endAt.toISOString(),
        note: note.trim() || null,
      });
      return;
    }
    await doSave(clientId, startAt.toISOString(), endAt.toISOString(), note.trim() || null);
  };

  const handleConfirmOverlapSave = () => {
    if (!confirmOverlap) return;
    doSave(
      confirmOverlap.clientId,
      confirmOverlap.startAtIso,
      confirmOverlap.endAtIso,
      confirmOverlap.note
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-reservation-title"
    >
      <div
        className="bg-white dark:bg-primary-950 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-primary-200 dark:border-primary-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-primary-200 dark:border-primary-800">
          <h2 id="new-reservation-title" className="text-lg font-semibold text-primary-800 dark:text-primary-100">
            {t("newReservation")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-800"
            aria-label={tCommon("cancel")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-5">
          {confirmOverlap && (
            <div className="rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-600 p-3 space-y-3">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {t("overlapWarning")}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmOverlap(null)}
                  className="flex-1 py-2 rounded-xl border border-amber-600 text-amber-800 dark:text-amber-200 font-medium"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOverlapSave}
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50"
                >
                  {saving ? "…" : t("overlapConfirmSave")}
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
                {t("startTime")}
              </label>
              <div className="flex gap-2">
                <select
                  value={startTime.slice(0, 2)}
                  onChange={(e) => setStartTime(`${e.target.value}:${startTime.slice(3, 5) || "00"}`)}
                  className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-2 py-2 text-sm"
                >
                  {Array.from({ length: 24 }).map((_, h) => {
                    const hh = String(h).padStart(2, "0");
                    return (
                      <option key={hh} value={hh}>
                        {hh}
                      </option>
                    );
                  })}
                </select>
                <select
                  value={startTime.slice(3, 5) || "00"}
                  onChange={(e) => setStartTime(`${startTime.slice(0, 2) || "00"}:${e.target.value}`)}
                  className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-2 py-2 text-sm"
                >
                  {["00", "15", "30", "45"].map((mm) => (
                    <option key={mm} value={mm}>
                      {mm}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
                {t("endTime")}
              </label>
              <div className="flex gap-2">
                <select
                  value={endTime.slice(0, 2)}
                  onChange={(e) => setEndTime(`${e.target.value}:${endTime.slice(3, 5) || "00"}`)}
                  className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-2 py-2 text-sm"
                >
                  {Array.from({ length: 24 }).map((_, h) => {
                    const hh = String(h).padStart(2, "0");
                    return (
                      <option key={hh} value={hh}>
                        {hh}
                      </option>
                    );
                  })}
                </select>
                <select
                  value={endTime.slice(3, 5) || "00"}
                  onChange={(e) => setEndTime(`${endTime.slice(0, 2) || "00"}:${e.target.value}`)}
                  className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-2 py-2 text-sm"
                >
                  {["00", "15", "30", "45"].map((mm) => (
                    <option key={mm} value={mm}>
                      {mm}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="space-y-3 rounded-xl border border-primary-200 dark:border-primary-700 bg-primary-50/40 dark:bg-primary-900/40 p-3">
            <h3 className="text-sm font-semibold text-primary-800 dark:text-primary-100">
              {t("newReservationClientBlockTitle")}
            </h3>
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
                {t("client")} *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2 text-primary-900 dark:text-primary-100"
              >
                <option value="">{t("chooseClient")}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name || t("noClient")}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
                {t("note")}
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("newReservationNotePlaceholder")}
                className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-xl border border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300"
              >
                {tCommon("cancel")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-primary-500 text-white font-medium disabled:opacity-50"
              >
                {saving ? "…" : t("save")}
              </button>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-950 p-3">
            <h3 className="text-sm font-semibold text-primary-800 dark:text-primary-100">
              {t("newReservationVolnoBlockTitle")}
            </h3>
            <p className="text-xs text-primary-600 dark:text-primary-400">
              {t("volnoSlotHint")}
            </p>
            <button
              type="button"
              onClick={handleAddVolnoSlot}
              disabled={saving || !timeValid}
              className="w-full py-2.5 rounded-xl border-2 border-primary-500 text-primary-600 dark:text-primary-400 font-medium hover:bg-primary-50 dark:hover:bg-primary-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("addVolnoSlot")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
