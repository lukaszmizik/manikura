"use client";

import { AdminCalendarGrid, type AppointmentForGrid, type ClientOption } from "./AdminCalendarGrid";

type CalendarKeyedContentProps = {
  weekStart: string;
  appointments: AppointmentForGrid[];
  clients: ClientOption[];
  localeStr: string;
  displayStart?: string;
  displayEnd?: string;
  sickDateKeys?: string[];
  defaultSlotMinutes?: number;
};

/**
 * Obaluje AdminCalendarGrid s key={weekStart}, aby při změně týdne došlo k remountu a stav modálů se nerozbil.
 */
export function CalendarKeyedContent({
  weekStart,
  appointments,
  clients,
  localeStr,
  displayStart = "08:00",
  displayEnd = "20:00",
  sickDateKeys = [],
  defaultSlotMinutes = 120,
}: CalendarKeyedContentProps) {
  return (
    <AdminCalendarGrid
      key={weekStart}
      weekStart={weekStart}
      appointments={appointments}
      clients={clients}
      localeStr={localeStr}
      displayStart={displayStart}
      displayEnd={displayEnd}
      sickDateKeys={sickDateKeys}
      defaultSlotMinutes={defaultSlotMinutes}
    />
  );
}
