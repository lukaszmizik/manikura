/** Standardní délka jedné návštěvy (minuty) – sloty pro rezervaci klientem i výchozí v admin modalu */
const SLOT_MINUTES = 120;

/** Chyba při porušení exclusion constraint (překrývající se termíny). Klient může zobrazit přeloženou hlášku. */
export const SLOT_TAKEN_ERROR = "SLOT_TAKEN";

/** Den v týdnu 0 = neděle, 1 = pondělí, ... (jako JS Date.getDay()) */
export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/** Formát časového slotu pro zobrazení */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${String(h).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
}

/** Vygeneruje sloty o délce SLOT_MINUTES mezi start a end (časové řetězce "HH:mm" nebo "HH:mm:ss") */
export function getSlotsBetween(startTime: string, endTime: string): { start: string; end: string }[] {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let startM = (sh ?? 0) * 60 + (sm ?? 0);
  const endM = (eh ?? 0) * 60 + (em ?? 0);
  const slots: { start: string; end: string }[] = [];
  while (startM + SLOT_MINUTES <= endM) {
    const endSlot = startM + SLOT_MINUTES;
    slots.push({
      start: `${String(Math.floor(startM / 60)).padStart(2, "0")}:${String(startM % 60).padStart(2, "0")}`,
      end: `${String(Math.floor(endSlot / 60)).padStart(2, "0")}:${String(endSlot % 60).padStart(2, "0")}`,
    });
    startM = endSlot;
  }
  return slots;
}

/** Porovná čas "HH:mm" s časem z DB "HH:mm:ss" */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Je časový interval (start1,end1) v konfliktu s (start2,end2)? */
export function slotsOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
}

export const DAY_NAMES = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
