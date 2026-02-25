"use client";

import { useState, useCallback, Fragment, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  createAppointmentByAdmin,
  updateAppointmentTime,
  deleteAppointment,
  confirmAppointment,
  releaseAppointment,
  rejectAppointment,
  assignClientToFreeSlot,
} from "@/app/dashboard/calendar/actions";
import { SLOT_TAKEN_ERROR } from "@/lib/calendar";
import { NewReservationModal } from "./NewReservationModal";
import { AppointmentDetailModal } from "./AppointmentDetailModal";

const ROW_HEIGHT_PX = 40;
const SLOTS_PER_HOUR = 2;

/** "08:00" -> 8*60 = 480 */
function parseTimeToMinutes(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Vygeneruje pole časů od start do end po 30 min. "08:00", "20:00" -> ["08:00", "08:30", ..., "19:30"] */
function buildTimeSlots(displayStart: string, displayEnd: string): string[] {
  const startM = parseTimeToMinutes(displayStart);
  const endM = parseTimeToMinutes(displayEnd);
  const slots: string[] = [];
  for (let m = startM; m < endM; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return slots;
}

export type AppointmentForGrid = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  is_last_minute?: boolean;
  note?: string | null;
  client_change_reason?: string | null;
  client_change_requested_at?: string | null;
  client?: { display_name: string | null } | null;
  client_id?: string | null;
  guest_client_name?: string | null;
};

export type ClientOption = { id: string; display_name: string | null };

/** Týden začíná vždy pondělím. Neděle (getDay=0) = 7. den týdne, odečteme 6. */
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = neděle, 1 = pondělí, …, 6 = sobota
  const daysToSubtract = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - daysToSubtract);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DD v lokálním čase (pro query ?week= – server bere pondělí týdne) */
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function timeToRowMinutes(startAt: Date, displayStartMinutes: number): number {
  const dateMinutes = startAt.getHours() * 60 + startAt.getMinutes();
  return dateMinutes - displayStartMinutes;
}

function durationMinutes(startAt: Date, endAt: Date): number {
  return (endAt.getTime() - startAt.getTime()) / (60 * 1000);
}

type AdminCalendarGridProps = {
  weekStart: string;
  appointments: AppointmentForGrid[];
  clients: ClientOption[];
  localeStr: string;
  displayStart?: string;
  displayEnd?: string;
  sickDateKeys?: string[];
  defaultSlotMinutes?: number;
};

export function AdminCalendarGrid({
  weekStart,
  appointments,
  clients,
  localeStr,
  displayStart = "08:00",
  displayEnd = "20:00",
  sickDateKeys = [],
  defaultSlotMinutes = 120,
}: AdminCalendarGridProps) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const locale = useLocale();
  const monday = new Date(weekStart + "T12:00:00");
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDays.push(d);
  }

  const timeSlots = buildTimeSlots(displayStart, displayEnd);
  const totalRows = timeSlots.length;
  const displayStartMinutes = parseTimeToMinutes(displayStart);

  const [newModal, setNewModal] = useState<{ date: string; time: string } | null>(null);
  const [detailApt, setDetailApt] = useState<AppointmentForGrid | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const prevWeekStart = new Date(monday.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextWeekStart = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000);

  const startOfWeek = weekDays[0].getTime();
  const endOfWeek = weekDays[6].getTime() + 24 * 60 * 60 * 1000;
  const inRange = (apt: AppointmentForGrid) => {
    const t = new Date(apt.start_at).getTime();
    return t >= startOfWeek && t < endOfWeek;
  };
  const appointmentsInWeek = appointments.filter(inRange);

  const byDay: Record<string, AppointmentForGrid[]> = {};
  weekDays.forEach((d) => {
    byDay[toDateKey(d)] = [];
  });
  appointmentsInWeek.forEach((apt) => {
    const key = toDateKey(new Date(apt.start_at));
    if (byDay[key]) byDay[key].push(apt);
  });

  const handleSlotClick = useCallback((dateKey: string, time: string) => {
    setNewModal({ date: dateKey, time });
  }, []);

  const handleCreate = useCallback(
    async (params: {
      clientId: string | null;
      guestClientName: string | null;
      saveGuest: boolean;
      startAtIso: string;
      endAtIso: string;
      note: string | null;
      isLastMinute: boolean;
      ignoreWarnings?: boolean;
    }) => {
      const res = await createAppointmentByAdmin(params);
      if (res.error) {
        return res.error === SLOT_TAKEN_ERROR ? t("slotTaken") : res.error;
      }
      setNewModal(null);
      router.refresh();
      return null;
    },
    [router, t]
  );

  const handleUpdateTime = useCallback(
    async (id: string, startAtIso: string, endAtIso: string) => {
      const res = await updateAppointmentTime(id, startAtIso, endAtIso);
      if (res.error) {
        return res.error === SLOT_TAKEN_ERROR ? t("slotTaken") : res.error;
      }
      setDetailApt(null);
      router.refresh();
      return null;
    },
    [router, t]
  );

  const handleDelete = useCallback(
    async (id: string, reason?: string | null) => {
      const res = await deleteAppointment(id, reason);
      if (res.error) return res.error;
      setDetailApt(null);
      router.refresh();
      return null;
    },
    [router]
  );

  const handleConfirm = useCallback(
    async (id: string) => {
      const res = await confirmAppointment(id);
      if (res.error) return res.error;
      setDetailApt(null);
      router.refresh();
      return null;
    },
    [router]
  );

  const handleRelease = useCallback(
    async (id: string) => {
      const res = await releaseAppointment(id);
      if (res.error) return res.error;
      setDetailApt(null);
      router.refresh();
      return null;
    },
    [router]
  );

  const handleReject = useCallback(
    async (id: string, reason: string) => {
      const res = await rejectAppointment(id, reason);
      if (res.error) return res.error;
      setDetailApt(null);
      router.refresh();
      return null;
    },
    [router]
  );

  const handleAssignClientToVolno = useCallback(
    async (id: string, clientId: string) => {
      const res = await assignClientToFreeSlot(id, clientId);
      if (res.error) return res.error;
      setDetailApt(null);
      router.refresh();
      return null;
    },
    [router]
  );

  const todayKey = toDateKey(new Date());
  // weekStart z serveru = vždy pondělí. prev = -7 dní, next = natvrdo +7 dní k pondělí.
  const prevWeekKeyStr = toLocalDateKey(prevWeekStart);
  const nextMondayDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);
  const nextWeekKeyStr = toLocalDateKey(nextMondayDate);
  const weekNavClass =
    "p-2 rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50 dark:border-primary-700 dark:hover:bg-primary-800/50 inline-flex";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 relative z-20 bg-white dark:bg-primary-950 rounded-lg py-1 -mx-1 px-1">
        <div className="shrink-0" />
        <div className="flex items-center gap-2 shrink-0 relative z-[11]">
          <Link
            href={{ pathname: "/dashboard/calendar", query: { week: prevWeekKeyStr } }}
            className={weekNavClass}
            aria-label={t("prevWeek")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <span className="text-sm font-medium text-primary-800 min-w-[200px] text-center">
            {weekDays[0].toLocaleDateString(localeStr, { month: "long", year: "numeric" })}
            {" – "}
            {weekDays[0].getDate()}. {weekDays[0].getMonth() + 1}. – {weekDays[6].getDate()}. {weekDays[6].getMonth() + 1}.
          </span>
          <Link
            href={{ pathname: "/dashboard/calendar", query: { week: nextWeekKeyStr } }}
            className={weekNavClass}
            aria-label={t("nextWeek")}
          >
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      <div className="w-full min-w-0">
        <div className="relative w-full">
        <div
          className="grid w-full border border-primary-200 rounded-xl overflow-hidden bg-white dark:bg-primary-950"
          style={{
            gridTemplateColumns: `minmax(40px, 40px) repeat(7, minmax(0, 1fr))`,
            gridTemplateRows: `28px repeat(${totalRows}, ${ROW_HEIGHT_PX}px)`,
          }}
        >
          <div className="col-span-1 row-span-1 border-b border-r border-primary-200 bg-primary-50/50 dark:bg-primary-900/30" />
          {weekDays.map((d) => {
            const dateKey = toDateKey(d);
            const localKey = toLocalDateKey(d);
            const isSickDay = sickDateKeys.includes(localKey);
            const isToday = dateKey === todayKey;
            const dayName = d.toLocaleDateString(localeStr, { weekday: "short" });
            const dayNarrow = d.toLocaleDateString(localeStr, { weekday: "narrow" });
            const dateStr = `${d.getDate()}.${d.getMonth() + 1}.`;
            return (
              <div
                key={dateKey}
                title={isSickDay ? `${dayName} ${d.getDate()}.${d.getMonth() + 1}. – ${t("restrictionSick")}` : dayName + " " + d.getDate() + "." + (d.getMonth() + 1) + "."}
                className={`min-w-0 overflow-hidden border-b border-primary-200 text-center py-0.5 px-0.5 text-[10px] font-medium ${
                  isSickDay
                    ? "bg-primary-100/80 dark:bg-primary-800/50 text-primary-500 dark:text-primary-400"
                    : isToday
                      ? "bg-amber-100/80 dark:bg-amber-900/30 text-primary-700 dark:text-primary-300"
                      : "bg-primary-50/30 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                }`}
              >
                <span className="truncate inline">{dayNarrow} {dateStr}</span>
              </div>
            );
          })}
          {timeSlots.map((timeLabel, rowIndex) => (
            <Fragment key={rowIndex}>
              <div
                className="border-r border-primary-100 text-xs text-primary-500 py-0.5 pr-1 text-right"
              >
                {rowIndex % 2 === 0 ? timeLabel : ""}
              </div>
              {weekDays.map((d) => {
                const dateKey = toDateKey(d);
                const localKey = toLocalDateKey(d);
                const isSickDay = sickDateKeys.includes(localKey);
                const isToday = dateKey === todayKey;
                const cellClass = [
                  "border-b border-r border-primary-100 min-h-[40px]",
                  !isSickDay && "hover:bg-primary-100/50 dark:hover:bg-primary-800/30",
                  isSickDay && "bg-primary-100/50 dark:bg-primary-800/50 cursor-not-allowed opacity-75",
                  isToday && !isSickDay && "bg-amber-50/70 dark:bg-amber-900/20",
                ]
                  .filter(Boolean)
                  .join(" ");
                if (isSickDay) {
                  return (
                    <div
                      key={`${dateKey}-${rowIndex}`}
                      className={cellClass}
                      title={t("restrictionSick")}
                      aria-label={`${dateKey} ${timeLabel} – ${t("restrictionSick")}`}
                    />
                  );
                }
                return (
                  <button
                    key={`${dateKey}-${rowIndex}`}
                    type="button"
                    className={cellClass}
                    onClick={() => handleSlotClick(dateKey, timeLabel)}
                    aria-label={`${dateKey} ${timeLabel}`}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>

        {/* Overlay: appointment blocks in each day column, spanning full height */}
        <div
          className="grid w-full pointer-events-none absolute top-0 left-0 right-0"
          style={{
            gridTemplateColumns: `minmax(40px, 40px) repeat(7, minmax(0, 1fr))`,
            gridTemplateRows: `28px repeat(${totalRows}, ${ROW_HEIGHT_PX}px)`,
          }}
        >
          <div className="col-span-1 row-span-full" aria-hidden="true" />
          {weekDays.map((d, colIndex) => {
            const dateKey = toDateKey(d);
            const dayAppointments = byDay[dateKey] ?? [];
            const isToday = dateKey === todayKey;
            const displayEndMinutes = parseTimeToMinutes(displayEnd);
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            const showNowLine =
              isToday &&
              nowMinutes >= displayStartMinutes &&
              nowMinutes < displayEndMinutes;
            const nowLineTopPx =
              showNowLine
                ? ((nowMinutes - displayStartMinutes) / 30) * ROW_HEIGHT_PX
                : 0;

            return (
              <div
                key={dateKey}
                className="relative pointer-events-none"
                style={{ gridColumn: colIndex + 2, gridRow: "2 / -1" }}
              >
                {showNowLine && (
                  <div
                    className="absolute left-0 right-0 flex items-center z-10 pointer-events-none"
                    style={{ top: nowLineTopPx - 1 }}
                    aria-hidden
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <span className="flex-1 h-0.5 bg-red-500" />
                  </div>
                )}
                {dayAppointments.map((apt) => {
                  const start = new Date(apt.start_at);
                  const end = new Date(apt.end_at);
                  const topMinutes = timeToRowMinutes(start, displayStartMinutes);
                  const dur = durationMinutes(start, end);
                  const topPx = (topMinutes / 30) * ROW_HEIGHT_PX;
                  const heightPx = Math.max(24, (dur / 30) * ROW_HEIGHT_PX);
                  const isVolno = !apt.client_id && !(apt.guest_client_name && apt.guest_client_name.trim());
                  const displayName = isVolno
                    ? t("unoccupiedSlot")
                    : (apt.guest_client_name && apt.guest_client_name.trim()) ||
                      (apt.client && typeof apt.client === "object" && "display_name" in apt.client
                        ? (apt.client.display_name ?? t("noClient"))
                        : t("noClient"));
                  const hasChangeRequest = !!(apt.status === "confirmed" && apt.client_change_requested_at);
                  const blockClass = hasChangeRequest
                    ? "absolute left-0.5 right-0.5 rounded-md bg-amber-500 text-amber-950 text-left text-xs font-medium overflow-hidden shadow cursor-pointer hover:bg-amber-600 hover:text-white flex flex-col justify-center px-1.5 py-0.5 pointer-events-auto"
                    : apt.status === "confirmed"
                      ? "absolute left-0.5 right-0.5 rounded-md bg-emerald-500 text-white text-left text-xs font-medium overflow-hidden shadow cursor-pointer hover:bg-emerald-600 flex flex-col justify-center px-1.5 py-0.5 pointer-events-auto"
                      : "absolute left-0.5 right-0.5 rounded-md bg-primary-500 text-white text-left text-xs font-medium overflow-hidden shadow cursor-pointer hover:bg-primary-600 flex flex-col justify-center px-1.5 py-0.5 pointer-events-auto";
                  return (
                    <button
                      key={apt.id}
                      type="button"
                      className={blockClass}
                      style={{
                        top: topPx + 2,
                        height: heightPx - 4,
                        minHeight: 20,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailApt(apt);
                      }}
                    >
                      <span className="truncate">{displayName}</span>
                      <span className="text-primary-100 text-[10px]">
                        {start.toLocaleTimeString(localeStr, { hour: "2-digit", minute: "2-digit" })}
                        –{end.toLocaleTimeString(localeStr, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        </div>
      </div>

      <p className="text-xs text-primary-500">
        {t("calendarHint")}
      </p>

      {newModal && (
        <NewReservationModal
          initialDate={newModal.date}
          initialTime={newModal.time}
          clients={clients}
          defaultSlotMinutes={defaultSlotMinutes}
          existingOnDay={(byDay[newModal.date] ?? []).map((a) => ({ start_at: a.start_at, end_at: a.end_at }))}
          onSave={async (params) =>
            handleCreate({
              clientId: params.clientId ?? null,
              guestClientName: params.guestClientName ?? null,
              saveGuest: params.saveGuest,
              startAtIso: params.startAtIso,
              endAtIso: params.endAtIso,
              note: params.note,
              isLastMinute: params.isLastMinute,
              ignoreWarnings: params.ignoreWarnings,
            })
          }
          onClose={() => setNewModal(null)}
        />
      )}
      {detailApt && (
        <AppointmentDetailModal
          appointment={detailApt}
          localeStr={localeStr}
          onUpdateTime={handleUpdateTime}
          onDelete={handleDelete}
          onConfirm={handleConfirm}
          onRelease={handleRelease}
          onReject={handleReject}
          clients={clients}
          onAssignClientToVolno={handleAssignClientToVolno}
          onClose={() => setDetailApt(null)}
        />
      )}
    </div>
  );
}
