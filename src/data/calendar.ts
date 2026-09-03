/* The plan window and the two vegetarian periods.

   The single most consequential rule in this file: vegetarian status is a
   property of the DAY, never of the week. The worst defect in the project's
   history came from deciding one mode per week by majority vote — weeks 6 and 8
   would have served meat on three fasting days, and week 4 forced vegetarian
   food onto two normal ones. Every day is planned against its own status. */

export const START = new Date(2026, 7, 31);  // Monday 31 August 2026
export const END = new Date(2026, 11, 10);   // Thursday 10 December 2026

/** Ganesh Chaturthi and Dasara. Dates verified against Hindu calendar sources. */
export const FESTIVALS: { name: string; from: Date; to: Date }[] = [
  { name: 'Ganesh Chaturthi', from: new Date(2026, 8, 14), to: new Date(2026, 8, 25) },
  { name: 'Dasara', from: new Date(2026, 9, 11), to: new Date(2026, 9, 20) },
];

const DAY_MS = 864e5;

/** 102. The legacy app printed "22 of 101" — it was a string literal, and wrong. */
export const DAYS = Math.round((END.getTime() - START.getTime()) / DAY_MS) + 1;
/** 15. Of these, two are entirely vegetarian, three are mixed, ten are normal. */
export const WEEKS = Math.ceil(DAYS / 7);

export const dayOf = (i: number): Date => new Date(START.getTime() + i * DAY_MS);

/** Which festival, if any, makes this date vegetarian. */
export const festivalOn = (d: Date): string | null =>
  FESTIVALS.find(w => d >= w.from && d <= w.to)?.name ?? null;

/** The calendar's own verdict. A user override sits on top of this, never inside it. */
export const isFestivalVeg = (d: Date): boolean => festivalOn(d) !== null;

export const fmtShort = (d: Date): string =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
export const fmtLong = (d: Date): string =>
  d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

/** Day index for a real date, or null when it falls outside the plan window. */
export function indexOf(d: Date): number | null {
  const at = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const i = Math.round((at - START.getTime()) / DAY_MS);
  return i >= 0 && i < DAYS ? i : null;
}

export const weekOf = (dayIndex: number): number => Math.floor(dayIndex / 7);
export const weekStart = (w: number): number => w * 7;
