import { timeToMinutes, slotsOverlap } from "./calendar";

export type FreeSlot = {
  start: string;
  end: string;
  isLastMinute: boolean;
  priceCzk: number | null;
  /** Pokud je nastaveno, slot je „volno“ od manikérky – klientka se přiřadí přes claim. */
  appointmentId?: string | null;
};

type AppointmentRow = { id?: string; client_id?: string | null; guest_client_name?: string | null; start_at: string; end_at: string };
type LastMinuteRow = { start_time: string; end_time: string; price_czk: number };

/**
 * Vrací volné sloty pro daný den pouze z toho, co admin explicitně nabídl:
 * - termíny s client_id = null a bez guest_client_name (volný slot vytvořený v kalendáři; slot s jménem neregistrované klientky se nebere jako volný),
 * - last minute nabídky pro ten den.
 * Pracovní doba se už nepoužívá – sloty negenerujeme z rozsahu pracovní doby.
 */
export function getFreeSlotsForDate(
  date: string,
  restrictions: { restriction_date: string }[],
  appointments: AppointmentRow[],
  lastMinuteOffers: LastMinuteRow[]
): FreeSlot[] {
  const restricted = restrictions.some((r) => r.restriction_date === date);
  if (restricted) return [];

  // Filtrovat podle dne v lokálním čase (stejná logika jako v book page), aby se neshodovaly časy s admin kalendářem.
  const startOfDay = new Date(`${date}T00:00:00`);
  const endOfDay = new Date(`${date}T23:59:59.999`);
  const dayAppointments = appointments.filter((a) => {
    const t = new Date(a.start_at).getTime();
    return t >= startOfDay.getTime() && t <= endOfDay.getTime();
  });
  const hasGuestName = (a: AppointmentRow) => !!(a.guest_client_name != null && a.guest_client_name.trim() !== "");
  const taken = dayAppointments.filter((a) => a.client_id != null || hasGuestName(a));
  const volno = dayAppointments.filter((a) => a.client_id == null && !hasGuestName(a) && a.id);

  const free: FreeSlot[] = [];

  // 1) Sloty z volných termínů (admin je vytvořil v kalendáři)
  for (const apt of volno) {
    const aptStart = apt.start_at.slice(11, 16);
    const aptEnd = apt.end_at.slice(11, 16);
    const lm = lastMinuteOffers.find((o) => {
      const oStart = o.start_time.slice(0, 5);
      const oEnd = o.end_time.slice(0, 5);
      return slotsOverlap(aptStart, aptEnd, oStart, oEnd);
    });
    free.push({
      start: aptStart,
      end: aptEnd,
      isLastMinute: !!lm,
      priceCzk: lm?.price_czk ?? null,
      appointmentId: apt.id ?? null,
    });
  }

  // 2) Last minute nabídky, které nepokrývá žádný volný termín (admin nabídl jen LM bez vytvoření slotu)
  for (const offer of lastMinuteOffers) {
    const oStart = offer.start_time.slice(0, 5);
    const oEnd = offer.end_time.slice(0, 5);
    const coveredByVolno = volno.some((apt) => {
      const aptStart = apt.start_at.slice(11, 16);
      const aptEnd = apt.end_at.slice(11, 16);
      return slotsOverlap(aptStart, aptEnd, oStart, oEnd);
    });
    if (coveredByVolno) continue;
    free.push({
      start: oStart,
      end: oEnd,
      isLastMinute: true,
      priceCzk: offer.price_czk,
      appointmentId: null,
    });
  }

  // 3) Vyřadit sloty, které se překrývají s obsazeným termínem
  const filtered = free.filter((slot) => {
    const overlapsTaken = taken.some((apt) => {
      const aptStart = apt.start_at.slice(11, 16);
      const aptEnd = apt.end_at.slice(11, 16);
      return slotsOverlap(slot.start, slot.end, aptStart, aptEnd);
    });
    return !overlapsTaken;
  });

  filtered.sort((a, b) => a.start.localeCompare(b.start));
  return filtered;
}
