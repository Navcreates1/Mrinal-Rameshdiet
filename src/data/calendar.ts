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

/* NEVER add 86,400,000 ms to walk a calendar.
   The users are in the UK and the plan spans 25 October 2026, the day the
   clocks go back. That day is 25 hours long, so adding 24 hours to it lands on
   the same local date again: 25 October appeared twice in the date strip, every
   day after it was one behind, and 10 December — the last day of the plan —
   became unreachable. Six and a half weeks of a fifteen-week plan attached to
   the wrong dates and the wrong weekdays.

   setDate() is calendar arithmetic and steps over the transition correctly.

   The test that was supposed to catch this compared toISOString() values, which
   are UTC and therefore stayed 102 unique strings while the local dates were
   101. An assertion that cannot observe the bug is not a test. calendartest.ts
   now checks local dates, weekdays and the transition itself. */
const dayCount = (from: Date, to: Date): number =>
  Math.round((Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
            - Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / 864e5);

/** 102. The legacy app printed "22 of 101" — it was a string literal, and wrong. */
export const DAYS = dayCount(START, END) + 1;
/** 15. Of these, two are entirely vegetarian, three are mixed, ten are normal. */
export const WEEKS = Math.ceil(DAYS / 7);

export function dayOf(i: number): Date {
  const d = new Date(START.getFullYear(), START.getMonth(), START.getDate());
  d.setDate(d.getDate() + i);
  return d;
}

/** Which festival, if any, makes this date vegetarian.
    Compared by calendar day, not by timestamp — a Date at 23:00 on the day
    before a window opens must not fall inside it. */
export const festivalOn = (d: Date): string | null =>
  FESTIVALS.find(w => dayCount(w.from, d) >= 0 && dayCount(d, w.to) >= 0)?.name ?? null;

/** The calendar's own verdict. A user override sits on top of this, never inside it. */
export const isFestivalVeg = (d: Date): boolean => festivalOn(d) !== null;

export const fmtShort = (d: Date): string =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
export const fmtLong = (d: Date): string =>
  d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

/** Day index for a real date, or null when it falls outside the plan window.
    Counted in calendar days, for the same reason as dayOf. */
export function indexOf(d: Date): number | null {
  const i = dayCount(START, d);
  return i >= 0 && i < DAYS ? i : null;
}

export const weekOf = (dayIndex: number): number => Math.floor(dayIndex / 7);
export const weekStart = (w: number): number => w * 7;
