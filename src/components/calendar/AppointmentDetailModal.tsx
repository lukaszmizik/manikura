"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { X, User, Pencil, Trash2, Unlock } from "lucide-react";
import type { AppointmentForGrid, ClientOption } from "./AdminCalendarGrid";

/** Rozdělí text na úseky a čísla odpovídající telefonu (8–15 cifer) převede na klikací tel: odkazy. */
function noteWithClickablePhones(text: string): (string | React.ReactNode)[] {
  const parts: (string | React.ReactNode)[] = [];
  const re = /(?:\+\s*)?\d[\d\s\-\.\(\)]{5,}/g;
  let lastIndex = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    const digitsOnly = raw.replace(/\D/g, "");
    if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
      if (m.index > lastIndex) {
        parts.push(text.slice(lastIndex, m.index));
      }
      const telHref = raw.trimStart().startsWith("+")
        ? "+" + digitsOnly
        : digitsOnly;
      parts.push(
        <a
          key={key++}
          href={`tel:${telHref}`}
          className="text-primary-600 dark:text-primary-400 underline hover:no-underline break-all"
        >
          {raw}
        </a>
      );
      lastIndex = re.lastIndex;
    }
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length ? parts : [text];
}

type AppointmentDetailModalProps = {
  appointment: AppointmentForGrid;
  localeStr: string;
  onUpdateTime: (id: string, startAtIso: string, endAtIso: string) => Promise<string | null>;
  onDelete: (id: string, reason?: string | null) => Promise<string | null>;
  onConfirm: (id: string) => Promise<string | null>;
  onRelease: (id: string) => Promise<string | null>;
  onReject: (id: string, reason: string) => Promise<string | null>;
  onClose: () => void;
  clients?: ClientOption[];
  onAssignClientToVolno?: (id: string, clientId: string) => Promise<string | null>;
};

export function AppointmentDetailModal({
  appointment,
  localeStr,
  onUpdateTime,
  onDelete,
  onConfirm,
  onRelease,
  onReject,
  onClose,
  clients,
  onAssignClientToVolno,
}: AppointmentDetailModalProps) {
  const t = useTranslations("calendar");
  const tCommon = useTranslations("common");
  const displayName =
    (appointment.guest_client_name && appointment.guest_client_name.trim()) ||
    (appointment.client && typeof appointment.client === "object" && "display_name" in appointment.client
      ? (appointment.client.display_name ?? t("noClient"))
      : t("noClient"));
  const start = new Date(appointment.start_at);
  const end = new Date(appointment.end_at);
  const clientId = appointment.client_id ?? "";

  const [editing, setEditing] = useState(false);
  const [startTime, setStartTime] = useState(start.toTimeString().slice(0, 5));
  const [endTime, setEndTime] = useState(end.toTimeString().slice(0, 5));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [assignClientId, setAssignClientId] = useState("");

  const dateKey = start.toISOString().slice(0, 10);
  const status = appointment.status ?? "pending";
  const changeRequestedAt = appointment.client_change_requested_at ?? null;
  const changeReason = appointment.client_change_reason ?? null;
  const isPending = status === "pending";
  const isVolno = !clientId;
  const isChangeRequested = status === "confirmed" && changeRequestedAt;

  const handleReleaseClick = async () => {
    setError(null);
    setSaving(true);
    const err = await onRelease(appointment.id);
    setSaving(false);
    if (err) setError(err);
    else onClose();
  };

  const handleSaveTime = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const startAt = new Date(`${dateKey}T${startTime}`);
    const endAt = new Date(`${dateKey}T${endTime}`);
    if (endAt.getTime() <= startAt.getTime()) {
      setError("Čas konce musí být po čase začátku.");
      return;
    }
    setSaving(true);
    const err = await onUpdateTime(appointment.id, startAt.toISOString(), endAt.toISOString());
    setSaving(false);
    if (err) setError(err);
    else setEditing(false);
  };

  const isConfirmed = status === "confirmed";

  const handleDeleteClick = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setDeleteReason("");
      setError(null);
      return;
    }
    setError(null);
    setSaving(true);
    const err = await onDelete(appointment.id, isConfirmed ? deleteReason.trim() || undefined : undefined);
    setSaving(false);
    if (err) setError(err);
    else onClose();
  };

  const handleAssignClientClick = async () => {
    if (!onAssignClientToVolno || !clients) return;
    if (!assignClientId.trim()) {
      setError(t("chooseClient"));
      return;
    }
    setError(null);
    setSaving(true);
    const err = await onAssignClientToVolno(appointment.id, assignClientId);
    setSaving(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-detail-title"
    >
      <div
        className="bg-white dark:bg-primary-950 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-primary-200 dark:border-primary-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-primary-200 dark:border-primary-800">
          <h2 id="appointment-detail-title" className="text-lg font-semibold text-primary-800 dark:text-primary-100">
            {t("appointmentDetail")}
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
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-primary-800 dark:text-primary-100">
            <User className="w-5 h-5 text-primary-500" />
            <span className="font-medium">{displayName}</span>
          </div>
          <p className="text-sm text-primary-600 dark:text-primary-400">
            {start.toLocaleDateString(localeStr, { weekday: "short", day: "numeric", month: "short" })}
            {" · "}
            {start.toLocaleTimeString(localeStr, { hour: "2-digit", minute: "2-digit" })}
            {" – "}
            {end.toLocaleTimeString(localeStr, { hour: "2-digit", minute: "2-digit" })}
          </p>

          {(appointment.note != null && appointment.note.trim() !== "") && (
            <div className="rounded-xl border border-primary-100 dark:border-primary-800 bg-primary-50/30 dark:bg-primary-900/20 p-3">
              <p className="text-xs font-medium text-primary-500 dark:text-primary-400 mb-1">{t("note")}</p>
              <p className="text-sm text-primary-700 dark:text-primary-300 whitespace-pre-wrap">
                {noteWithClickablePhones(appointment.note.trim())}
              </p>
            </div>
          )}

          {isPending && !isVolno && (
            <p className="text-sm text-primary-500 dark:text-primary-400 rounded-xl border border-primary-100 dark:border-primary-800 bg-primary-50/30 dark:bg-primary-900/20 p-3">
              {t("waitingForClientConfirm")}
            </p>
          )}

          {isPending && isVolno && (
            <div className="space-y-3 rounded-xl border border-primary-200 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/30 p-3">
              <p className="text-sm text-primary-600 dark:text-primary-400">
                {t("volnoSlotHint")}
              </p>
              {clients && onAssignClientToVolno && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-primary-700 dark:text-primary-300">
                    {t("chooseClient")}
                  </label>
                  <select
                    value={assignClientId}
                    onChange={(e) => setAssignClientId(e.target.value)}
                    className="w-full rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2 text-sm text-primary-900 dark:text-primary-100"
                  >
                    <option value="">{t("chooseClient")}</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.display_name || t("noClient")}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAssignClientClick}
                    disabled={saving}
                    className="w-full mt-1 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {saving ? "…" : t("save")}
                  </button>
                </div>
              )}
            </div>
          )}

          {isChangeRequested && (
            <div className="rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-600 p-3 space-y-2">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{t("clientRequestedChange")}</p>
              {changeReason && (
                <p className="text-sm text-amber-700 dark:text-amber-300 whitespace-pre-wrap">{changeReason}</p>
              )}
              <button
                type="button"
                onClick={handleReleaseClick}
                disabled={saving}
                className="inline-flex items-center gap-2 w-full justify-center py-2 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50"
              >
                <Unlock className="w-5 h-5" />
                {t("releaseSlot")}
              </button>
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}

          {editing ? (
            <form onSubmit={handleSaveTime} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-primary-500 mb-1">{t("startTime")}</label>
                  <input
                    type="time"
                    step={900}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border border-primary-200 dark:border-primary-700 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-primary-500 mb-1">{t("endTime")}</label>
                  <input
                    type="time"
                    step={900}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-lg border border-primary-200 dark:border-primary-700 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(false)} className="flex-1 py-2 rounded-xl border text-primary-700">
                  {tCommon("cancel")}
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium">
                  {saving ? "…" : t("save")}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 text-sm"
              >
                <Pencil className="w-4 h-4" />
                {t("editTime")}
              </button>
              {clientId && (
                <Link
                  href={`/dashboard/clients/${clientId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium"
                >
                  <User className="w-4 h-4" />
                  {t("visitCard")}
                </Link>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-primary-200 dark:border-primary-800">
            {confirmDelete ? (
              <div className="space-y-3">
                <p className="text-sm text-primary-600 dark:text-primary-400">
                  {isConfirmed ? t("deleteConfirmedConfirm") : t("deleteConfirm")}
                </p>
                {isConfirmed && (
                  <div>
                    <label className="block text-xs font-medium text-primary-500 mb-1">
                      {t("deleteConfirmedReasonLabel")}
                    </label>
                    <textarea
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder={t("deleteConfirmedReasonPlaceholder")}
                      rows={2}
                      className="w-full rounded-lg border border-primary-200 dark:border-primary-700 px-3 py-2 text-sm resize-none"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setConfirmDelete(false); setDeleteReason(""); setError(null); }}
                    className="flex-1 py-2 rounded-xl border border-primary-200 text-primary-700"
                  >
                    {tCommon("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl bg-red-500 text-white font-medium"
                  >
                    {saving ? "…" : t("delete")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                {t("delete")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
