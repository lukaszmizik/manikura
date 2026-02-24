"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createBooking, claimSlot } from "@/app/dashboard/calendar/actions";
import { SLOT_TAKEN_ERROR } from "@/lib/calendar";
import type { FreeSlot } from "@/lib/slots";

type MyAppointment = { id: string; start_at: string; end_at: string; status: string };

export function BookSlotPicker({
  selectedDate,
  minDate,
  slots,
  clientId,
  myAppointmentsForDay = [],
  appointmentIdsFromApprovedRequest = [],
}: {
  selectedDate: string;
  minDate: string;
  slots: FreeSlot[];
  clientId: string;
  myAppointmentsForDay?: MyAppointment[];
  /** Termíny vzešlé ze schválené žádosti – u nich zobrazit „Čeká na vaše potvrzení“, ne „Čeká na potvrzení manikérky“. */
  appointmentIdsFromApprovedRequest?: string[];
}) {
  const router = useRouter();
  const t = useTranslations("calendarBook");
  const tCal = useTranslations("calendar");
  const tCommon = useTranslations("common");

  function onDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (v) router.push(`/dashboard/calendar/book?date=${v}`);
  }

  async function onSlotClick(slot: FreeSlot) {
    if (slot.appointmentId) {
      const { error } = await claimSlot(slot.appointmentId);
      if (error) alert(error === SLOT_TAKEN_ERROR ? t("slotTaken") : error);
      else router.refresh();
      return;
    }
    const { error } = await createBooking(
      clientId,
      selectedDate,
      slot.start,
      slot.end,
      slot.isLastMinute,
      slot.priceCzk
    );
    if (error) alert(error === SLOT_TAKEN_ERROR ? t("slotTaken") : error);
    else router.refresh();
  }

  const dateLabel = new Date(selectedDate + "T12:00:00").toLocaleDateString("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      {myAppointmentsForDay.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-2">{tCal("yourAppointments")}</h3>
          <ul className="space-y-2 mb-4">
            {myAppointmentsForDay.map((apt) => {
              const start = apt.start_at.slice(11, 16);
              const end = apt.end_at.slice(11, 16);
              const isPending = apt.status === "pending";
              const isFromApprovedRequest = appointmentIdsFromApprovedRequest.includes(apt.id);
              const pendingLabel = isFromApprovedRequest ? tCal("waitingForYourConfirm") : tCal("waitingForAdminConfirm");
              return (
                <li
                  key={apt.id}
                  className={`py-2 px-3 rounded-xl border-2 text-sm font-medium ${
                    isPending
                      ? "border-primary-200 bg-primary-100/50 text-primary-600 dark:border-primary-700 dark:bg-primary-800/30 dark:text-primary-400 opacity-90"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                  }`}
                >
                  <span>{start} – {end}</span>
                  <span className="ml-2 text-xs font-normal">
                    {isPending ? pendingLabel : tCal("confirmed")}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <label className="block">
        <span className="text-sm font-medium text-primary-800 dark:text-primary-100">{tCommon("date")}</span>
        <input
          type="date"
          min={minDate}
          value={selectedDate}
          onChange={onDateChange}
          className="mt-1 block w-full rounded-xl border border-primary-200 px-4 py-3"
        />
      </label>
      <p className="text-sm text-primary-600">{dateLabel}</p>
      {slots.length === 0 ? (
        <p className="text-sm text-primary-500">{tCal("noSlotsForDay")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {slots.map((slot) => (
            <button
              key={`${slot.start}-${slot.end}`}
              type="button"
              onClick={() => onSlotClick(slot)}
              className={`py-3 px-4 rounded-xl border-2 text-left font-medium ${
                slot.isLastMinute
                  ? "border-amber-400 bg-amber-50 text-amber-900 hover:border-amber-500 dark:bg-amber-900/30 dark:text-amber-100 dark:border-amber-600"
                  : "border-sky-300 bg-sky-50 text-sky-900 hover:border-sky-400 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-100 dark:hover:bg-sky-900/60"
              }`}
            >
              <span>{slot.start} – {slot.end}</span>
              {slot.isLastMinute && slot.priceCzk != null && (
                <span className="block text-sm font-normal text-amber-700 dark:text-amber-300">{slot.priceCzk} Kč (akce)</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
