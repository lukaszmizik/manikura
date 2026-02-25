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
  onSave: (params: {
    clientId: string | null;
    guestClientName: string | null;
    saveGuest: boolean;
    startAtIso: string;
    endAtIso: string;
    note: string | null;
    isLastMinute: boolean;
    ignoreWarnings?: boolean;
  }) => Promise<string | null>;
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
  const [guestClientName, setGuestClientName] = useState("");
  const [saveGuest, setSaveGuest] = useState(false);
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
    guestClientName: string | null;
    saveGuest: boolean;
    startAtIso: string;
    endAtIso: string;
    note: string | null;
  } | null>(null);

  const startAt = new Date(`${initialDate}T${startTime}`);
  const endAt = new Date(`${initialDate}T${endTime}`);
  const timeValid = endAt.getTime() > startAt.getTime();

  const [warning, setWarning] = useState<{
    summary: string;
    payload: {
      clientId: string | null;
      guestClientName: string | null;
      saveGuest: boolean;
      startAtIso: string;
      endAtIso: string;
      note: string | null;
      isLastMinute: boolean;
    };
  } | null>(null);

  const hasOverlap = timeValid && existingOnDay.some((apt) =>
    intervalsOverlap(
      startAt,
      endAt,
      new Date(apt.start_at),
      new Date(apt.end_at)
    )
  );

  const doSave = async (params: {
    clientId: string | null;
    guestClientName: string | null;
    saveGuest: boolean;
    startAtIso: string;
    endAtIso: string;
    note: string | null;
    isLastMinute: boolean;
    ignoreWarnings?: boolean;
  }) => {
    setError(null);
    setWarning(null);
    setSaving(true);
    const err = await onSave(params);
    setSaving(false);
    if (err) {
      if (err.startsWith("CLIENT_WARNING:")) {
        const summary = err.slice("CLIENT_WARNING:".length).trim();
        setWarning({
          summary,
          payload: {
            clientId: params.clientId,
            guestClientName: params.guestClientName,
            saveGuest: params.saveGuest,
            startAtIso: params.startAtIso,
            endAtIso: params.endAtIso,
            note: params.note,
            isLastMinute: params.isLastMinute,
          },
        });
        return;
      }
      setError(err);
    } else {
      setConfirmOverlap(null);
      setWarning(null);
    }
  };

  const handleAddVolnoSlot = async () => {
    setError(null);
    setConfirmOverlap(null);
    setWarning(null);
    if (!timeValid) {
      setError("Čas konce musí být po čase začátku.");
      return;
    }
    if (hasOverlap) {
      setConfirmOverlap({
        clientId: null,
        guestClientName: null,
        saveGuest: false,
        startAtIso: startAt.toISOString(),
        endAtIso: endAt.toISOString(),
        note: note.trim() || null,
      });
      return;
    }
    await doSave({
      clientId: null,
      guestClientName: null,
      saveGuest: false,
      startAtIso: startAt.toISOString(),
      endAtIso: endAt.toISOString(),
      note: note.trim() || null,
      isLastMinute: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfirmOverlap(null);
    setWarning(null);
    const hasClient = clientId.trim() !== "";
    const hasGuestName = guestClientName.trim() !== "";
    if (!hasClient && !hasGuestName) {
      setError(t("chooseClientOrGuest"));
      return;
    }
    if (hasClient && hasGuestName) {
      setError(t("chooseClientOrGuestOnlyOne"));
      return;
    }
    if (!timeValid) {
      setError("Čas konce musí být po čase začátku.");
      return;
    }
    const payload = {
      clientId: hasClient ? clientId : null,
      guestClientName: hasGuestName ? guestClientName.trim() : null,
      saveGuest: hasGuestName ? saveGuest : false,
      startAtIso: startAt.toISOString(),
      endAtIso: endAt.toISOString(),
      note: note.trim() || null,
      isLastMinute: false,
    };
    if (hasOverlap) {
      setConfirmOverlap({
        clientId: payload.clientId,
        guestClientName: payload.guestClientName,
        saveGuest: payload.saveGuest,
        startAtIso: payload.startAtIso,
        endAtIso: payload.endAtIso,
        note: payload.note,
      });
      return;
    }
    await doSave(payload);
  };

  const handleConfirmOverlapSave = () => {
    if (!confirmOverlap) return;
    doSave({
      clientId: confirmOverlap.clientId,
      guestClientName: confirmOverlap.guestClientName,
      saveGuest: confirmOverlap.saveGuest,
      startAtIso: confirmOverlap.startAtIso,
      endAtIso: confirmOverlap.endAtIso,
      note: confirmOverlap.note,
      isLastMinute: false,
    });
  };

  const handleConfirmWarning = () => {
    if (!warning) return;
    doSave({
      ...warning.payload,
      ignoreWarnings: true,
    });
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
          {warning && (
            <div className="rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-600 p-3 space-y-3">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Chcete naplánovat klientku s&nbsp;výstrahou:{" "}
                <span className="font-semibold">{warning.summary}</span>?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWarning(null)}
                  className="flex-1 py-2 rounded-xl border border-amber-600 text-amber-800 dark:text-amber-200 font-medium"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmWarning}
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50"
                >
                  {saving ? "…" : "OK"}
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
                onChange={(e) => {
                  setClientId(e.target.value);
                  if (e.target.value) setGuestClientName("");
                }}
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
            <p className="text-xs text-primary-500 dark:text-primary-400">{t("guestClientOrSelect")}</p>
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
                {t("guestClientNameLabel")}
              </label>
              <input
                type="text"
                value={guestClientName}
                onChange={(e) => {
                  setGuestClientName(e.target.value);
                  if (e.target.value.trim()) setClientId("");
                }}
                placeholder={t("guestClientNamePlaceholder")}
                className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2 text-primary-900 dark:text-primary-100"
              />
              {guestClientName.trim() && (
                <label className="mt-2 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveGuest}
                    onChange={(e) => setSaveGuest(e.target.checked)}
                    className="rounded border-primary-300"
                  />
                  <span className="text-sm text-primary-700 dark:text-primary-300">{t("saveGuestAccount")}</span>
                </label>
              )}
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
