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

import { isFestivalVeg, festivalOn, dayOf, indexOf, DAYS } from '../data/calendar.ts';
import { M } from '../data/meals.ts';
import { F } from '../data/foods.ts';
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

/* Saved state is UNTRUSTED INPUT.

   It has been through an older version of this app, a browser that may have
   half-written it, and anything a person can type into a console. A partial
   `{"plans":{"0":{}}}` used to reach todayPlan() and throw
   `Cannot read properties of undefined`, which left a white page below the
   header and no way back except clearing site data — which nobody in this
   household knows how to do.

   Every field is now checked on its own and falls back on its own. One bad
   week plan loses that week, not the weigh-ins, the prices and the cupboard. */

const isStr = (v: unknown): v is string => typeof v === 'string';
const strArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter(isStr) : []);
const strMap = (v: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (isStr(x)) out[k] = x;
  return out;
};
const boolMap = (v: unknown): Record<string, boolean> => {
  const out: Record<string, boolean> = {};
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (typeof x === 'boolean') out[k] = x;
  return out;
};
const numMap = (v: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) if (typeof x === 'number' && Number.isFinite(x) && x >= 0) out[k] = x;
  return out;
};

const cleanWeights = (v: unknown): AppState['weights'] => {
  const one = (a: unknown): { d: number; kg: number }[] =>
    Array.isArray(a)
      ? a.filter((w): w is { d: number; kg: number } =>
          !!w && typeof w === 'object'
          && Number.isFinite((w as { d: unknown }).d) && Number.isFinite((w as { kg: unknown }).kg)
          && (w as { kg: number }).kg >= MIN_KG && (w as { kg: number }).kg <= MAX_KG)
      : [];
  const o = (v ?? {}) as { M?: unknown; R?: unknown };
  return { M: one(o.M), R: one(o.R) };
};

/** A week plan is only kept if every meal id in it still exists. A dish removed
    from the library must not blank the app for anyone who had it planned. */
const cleanPlans = (v: unknown): Record<number, WeekPlan> => {
  const out: Record<number, WeekPlan> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, raw] of Object.entries(v)) {
    const w = Number(k);
    if (!Number.isInteger(w) || w < 0) continue;
    const p = raw as { days?: unknown; builtAt?: unknown };
    if (!Array.isArray(p?.days)) continue;
    const days = p.days.map(d => {
      if (d === null || d === undefined) return null;
      const day = d as { core?: unknown; later?: unknown };
      const core = strArray(day.core).filter(id => M[id]);
      if (core.length !== 3) return null;
      return { core, later: strArray(day.later).filter(id => M[id]) };
    });
    if (!days.some(d => d !== null)) continue;
    out[w] = { days, builtAt: isStr(p.builtAt) ? p.builtAt : '' };
  }
  return out;
};

const cleanSwaps = (v: unknown): Record<string, Swap> => {
  const out: Record<string, Swap> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, raw] of Object.entries(v)) {
    const sw = raw as { fid?: unknown; g?: unknown };
    if (isStr(sw?.fid) && F[sw.fid] && typeof sw.g === 'number' && Number.isFinite(sw.g) && sw.g > 0)
      out[k] = { fid: sw.fid, g: sw.g };
  }
  return out;
};

const cleanPicks = (v: unknown): Picks => {
  const p = (v ?? {}) as Record<string, unknown>;
  return {
    b: strArray(p.b).filter(id => M[id]), l: strArray(p.l).filter(id => M[id]),
    d: strArray(p.d).filter(id => M[id]), later: strArray(p.later).filter(id => M[id]),
    veg: strArray(p.veg).filter(id => F[id]),
    wantLater: p.wantLater === true,
  };
};

const cleanDayTypes = (v: unknown): Record<number, DayType> => {
  const out: Record<number, DayType> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, t] of Object.entries(v)) {
    const i = Number(k);
    if (Number.isInteger(i) && i >= 0 && i < DAYS && (t === 'normal' || t === 'vegetarian' || t === 'out'))
      out[i] = t;
  }
  return out;
};

export const MIN_KG = 30;
export const MAX_KG = 200;

export function restore(): void {
  const s = load();
  state.weights = cleanWeights(s.w);
  state.have = boolMap(s.have);
  state.ticked = boolMap(s.ticked);
  state.prices = numMap(s.prices);
  state.plans = cleanPlans(s.plans);
  state.swaps = cleanSwaps(s.swaps);
  const pick = (s.pick ?? {}) as Record<string, unknown>;
  state.picks = cleanPicks(pick.picks);
  state.dayType = cleanDayTypes(pick.dayType);
  state.slotPick = strMap(pick.slotPick);
  const prefs = (s.prefs ?? {}) as Record<string, unknown>;
  if (prefs.mode === 'choose' || prefs.mode === 'fixed') state.mode = prefs.mode;
  if (prefs.who === 'both' || prefs.who === 'M' || prefs.who === 'R') state.who = prefs.who;
  if (prefs.logWho === 'M' || prefs.logWho === 'R') state.logWho = prefs.logWho;

  /* indexOf counts calendar days, so this is right on both sides of the
     October clock change. Before the fix, opening the app on 1 November put
     you on 31 October's plan. */
  const i = indexOf(new Date());
  state.day = i ?? (new Date() < dayOf(0) ? 0 : DAYS - 1);
  state.shopWeek = Math.floor(state.day / 7);
}

/** Wipe everything and start clean. The way back from a corrupted state. */
export function resetAll(): void {
  state.weights = { M: [], R: [] };
  state.have = {}; state.ticked = {}; state.prices = {};
  state.plans = {}; state.swaps = {}; state.slotPick = {};
  state.picks = emptyPicks(); state.dayType = {};
  state.step = 0; state.tab = 'today';
  persist();
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
