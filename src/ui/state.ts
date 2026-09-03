/* Application state, and the one idea the Shop tab was missing.

   THE DAY TYPE
   Naveen, 3 September 2026: "I've asked the app to ask me whether it's a
   vegetarian or non-vegetarian day, but it never asked me. It just decided
   that it's a normal day."

   He was right, and the cause is exact. weekDays() read a day's vegetarian
   status ONLY from the Ganesh and Dasara windows. Week 1 begins 31 August and
   contains neither, so all seven days were normal, the vegetarian dishes were
   filtered out of the picker, and there was nothing to ask about.

   The calendar is now a DEFAULT, not a verdict. Every day carries a type the
   user can set; the festival windows pre-set it and say why. */

import { isFestivalVeg, festivalOn, dayOf, DAYS } from '../data/calendar.ts';
import { load, save } from '../lib/storage.ts';
import type { Saved } from '../lib/storage.ts';
import type { PersonId } from '../data/people.ts';
import type { Swap } from '../lib/macros.ts';

export type DayType = 'normal' | 'vegetarian' | 'out';
export type TabId = 'today' | 'shop' | 'plan' | 'foods' | 'weight' | 'guide';
export type Who = PersonId | 'both';

export interface Picks {
  /** Dishes switched ON, per slot. Empty means nothing chosen yet — and that
      now means nothing chosen, not "use everything". */
  b: string[]; l: string[]; d: string[]; later: string[];
  veg: string[];
  /** Optional item wanted at all. Off by default: three meals is the plan. */
  wantLater: boolean;
}

export const emptyPicks = (): Picks =>
  ({ b: [], l: [], d: [], later: [], veg: [], wantLater: false });

export interface AppState {
  day: number;
  tab: TabId;
  who: Who;
  mode: 'choose' | 'fixed';
  shopWeek: number;
  step: number;
  /** Only where the user has overridden the calendar. */
  dayType: Record<number, DayType>;
  picks: Picks;
  /** Meal chosen by hand for one slot on one day, overriding the plan. */
  slotPick: Record<string, string>;
  swaps: Record<string, Swap>;
  weights: Saved['w'];
  have: Record<string, boolean>;
  ticked: Record<string, boolean>;
  prices: Record<string, number>;
  plans: Record<number, WeekPlan>;
  logWho: PersonId;
}

export interface WeekPlan {
  days: ({ core: string[]; later: string[] } | null)[];
  builtAt: string;
}

export const state: AppState = {
  day: 0, tab: 'today', who: 'both', mode: 'choose', shopWeek: 0, step: 0,
  dayType: {}, picks: emptyPicks(), slotPick: {}, swaps: {},
  weights: { M: [], R: [] }, have: {}, ticked: {}, prices: {}, plans: {},
  logWho: 'M',
};

/* ------------------------------------------------------------- day types */

/** The calendar's default for a day, before any override. */
export const defaultType = (i: number): DayType =>
  isFestivalVeg(dayOf(i)) ? 'vegetarian' : 'normal';

export const dayType = (i: number): DayType => state.dayType[i] ?? defaultType(i);

export const isVegDay = (i: number): boolean => dayType(i) === 'vegetarian';

/** Why a day is vegetarian by default, so the screen can say so. */
export const reasonFor = (i: number): string | null => festivalOn(dayOf(i));

export function setDayType(i: number, t: DayType): void {
  if (t === defaultType(i)) delete state.dayType[i];
  else state.dayType[i] = t;
  persist();
}

/** A day the user has moved off a fasting window. Never silent: the week
    review and the vegetarian check both report these as overrides. */
export const isOverriddenFestival = (i: number): boolean =>
  reasonFor(i) !== null && dayType(i) !== 'vegetarian';

/* ------------------------------------------------------------ persistence */

export function persist(): void {
  save({
    w: state.weights, have: state.have, ticked: state.ticked, prices: state.prices,
    plans: state.plans as unknown as Record<number, unknown>,
    /* These two were dropped by the legacy save(), so a reload reverted every
       choice while keeping the plan derived from them. */
    pick: { picks: state.picks, dayType: state.dayType, slotPick: state.slotPick },
    swaps: state.swaps,
    prefs: { mode: state.mode, who: state.who, logWho: state.logWho },
  });
}

export function restore(): void {
  const s = load();
  state.weights = s.w;
  state.have = s.have ?? {};
  state.ticked = s.ticked ?? {};
  state.prices = s.prices ?? {};
  state.plans = (s.plans ?? {}) as Record<number, WeekPlan>;
  state.swaps = (s.swaps ?? {}) as Record<string, Swap>;
  const pick = (s.pick ?? {}) as { picks?: Picks; dayType?: Record<number, DayType>; slotPick?: Record<string, string> };
  state.picks = { ...emptyPicks(), ...(pick.picks ?? {}) };
  state.dayType = pick.dayType ?? {};
  state.slotPick = pick.slotPick ?? {};
  const prefs = (s.prefs ?? {}) as { mode?: AppState['mode']; who?: Who; logWho?: PersonId };
  if (prefs.mode) state.mode = prefs.mode;
  if (prefs.who) state.who = prefs.who;
  if (prefs.logWho) state.logWho = prefs.logWho;

  const today = new Date();
  const at = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const i = Math.round((at - dayOf(0).getTime()) / 864e5);
  state.day = Math.min(DAYS - 1, Math.max(0, i));
  state.shopWeek = Math.floor(state.day / 7);
}

/** Swap keys carry the meal id, so changing the dish in a slot cannot drag the
    previous dish's ingredient swaps onto the new one and corrupt the portions. */
export const swapKey = (day: number, slot: string, mid: string, index: number): string =>
  `${day}:${slot}:${mid}:${index}`;

export function swapsFor(day: number, slot: string, mid: string): Record<number, Swap> {
  const out: Record<number, Swap> = {};
  const prefix = `${day}:${slot}:${mid}:`;
  for (const [k, v] of Object.entries(state.swaps))
    if (k.startsWith(prefix)) out[Number(k.slice(prefix.length))] = v;
  return out;
}
