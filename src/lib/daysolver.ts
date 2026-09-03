/* The day solver: which three dishes, not just how much of them.

   Handover section 9 found the two seven-day cycles by searching every
   combination of the five slots and scoring on distance from BOTH people's
   targets at once. Those cycles are a solved optimisation for a FIVE-slot day.

   Section 16.4 states the consequence plainly: "removing a dish must re-run the
   cycle search with it excluded and report the cost — pulling one dish out
   breaks a solved optimisation." Dropping two slots breaks it twice over, and
   the evidence is concrete: scaling the stored vegetarian cycle down to three
   meals puts days 2 and 6 at three paneer dishes in one day, which cannot reach
   the protein without carrying 66 g of fat against a 42 g target.

   So the day is searched, not stored. There are 36 normal and 144 vegetarian
   combinations of breakfast, lunch and dinner — small enough to score all of
   them, every time, from whatever the user actually switched on. */

import { M, isPulse } from '../data/meals.ts';
import { ROT } from '../data/cycle.ts';
import { PEOPLE, BANDS } from '../data/people.ts';
import type { PersonId } from '../data/people.ts';
import { solveDay } from './portion.ts';
import type { DaySolution } from './portion.ts';

export interface DayRequest {
  vegetarian: boolean;
  /** Dish ids the user left switched on, per slot. Empty means "the whole pool". */
  allow?: Partial<Record<'b' | 'l' | 'd' | 'later', string[]>>;
  /** How many optional "later" items this day has. 0 is the default and the ideal. */
  laterCount?: number;
  /** What has already been served this week, oldest first, per slot. Repeats are
      penalised by how recently a dish was used, so a 4-lunch pool spread over 7
      days alternates rather than settling into a three-day loop. */
  recent?: Partial<Record<'b' | 'l' | 'd' | 'later', string[]>>;
}

export interface DayResult {
  core: string[];
  later: string[];
  solved: Record<PersonId, DaySolution>;
  score: number;
  /** Why this day is imperfect, in plain words. Shown, never swallowed. */
  notes: string[];
}

/* Cost of serving a dish that was on the table N days ago. The library holds
   only three non-vegetarian dinners, so across seven days some repetition is
   arithmetic rather than laziness — the job is to spread it, not forbid it. */
const RECENCY = [0, 260, 170, 110, 70, 45, 30];
const REPEAT_FLOOR = 20;
const PERSON_WEIGHT: Record<PersonId, number> = { M: 1, R: 0.7 };
/* A gram of carbohydrate off target costs as much as 1.4 kcal off target; a
   gram of fat, 2.2. Fat is scarcer — 42 g against 130 g — so each gram of it
   is a larger share of its own budget. */
/* Raising FAT_WEIGHT does nothing measurable — swept at 2.2, 3.5 and 5.0, and
   Ramesh's fat moved by 0.4 of a percentage point. It is not a scoring choice:
   his fat comes from scaling her plate, and the oil band caps how far that can
   go. He lands near 54 g against a 60 g target and well above the 44 g floor,
   with calories, protein and carbohydrate all on target. Closing that gap means
   taking ~50 kcal out of his carbohydrate to put it into oil, which is not
   obviously better. Said on the Plan tab rather than tuned away. */
const KCAL_FREE = 30;
const CARB_WEIGHT = 1.4;
const FAT_WEIGHT = 2.2;

function repeatCost(history: string[] | undefined, id: string): number {
  if (!history?.length) return 0;
  let cost = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] !== id) continue;
    const ago = history.length - i;
    cost += RECENCY[ago] ?? REPEAT_FLOOR;
  }
  return cost;
}

const pool = (req: DayRequest, slot: 'b' | 'l' | 'd' | 'later'): string[] => {
  const key = req.vegetarian ? 'v' : 'nv';
  const full = slot === 'later'
    ? [...ROT[key].mm!, ...ROT[key].s!]
    : ROT[key][slot]!;
  const chosen = req.allow?.[slot];
  /* No silent fallback. The legacy poolFor returned the FULL list when the user
     had switched everything off, so turning a slot off did nothing at all while
     the screen said otherwise. An empty selection is now an empty selection and
     the caller is told. */
  return chosen === undefined ? full : full.filter(id => chosen.includes(id));
};

/** What is missing before a day can be built. Empty means go. */
export function missingSlots(req: DayRequest): string[] {
  const names: Record<string, string> = { b: 'Breakfast', l: 'Lunch', d: 'Dinner', later: 'Later' };
  const need: ('b' | 'l' | 'd' | 'later')[] = ['b', 'l', 'd'];
  if (req.laterCount) need.push('later');
  return need.filter(s => pool(req, s).length === 0).map(s => names[s]!);
}

function scoreDay(core: string[], later: string[], req: DayRequest): DayResult | null {
  if (core.some(id => isPulse(id)) && core.filter(id => isPulse(id)).length > 1) return null;
  if (req.vegetarian && [...core, ...later].some(id => M[id]!.v !== 1)) return null;

  const solved = {} as Record<PersonId, DaySolution>;
  const notes: string[] = [];
  let score = 0;

  for (const who of ['M', 'R'] as const) {
    const s = solveDay(core, later, who);
    solved[who] = s;
    const b = BANDS[who], t = s.total, name = PEOPLE[who].name;

    /* Hard rejections: the day is not safe, not merely imperfect. */
    if (t.p < b.pMin) return null;
    if (t.f < b.fMin) return null;

    const target = PEOPLE[who].t;

    /* Calories are what drive the loss, so they get a quadratic tail: the first
       30 kcal of drift is cheap, and the macro terms below are free to steer
       inside it, but anything past that becomes expensive fast. A flat linear
       cost let one day trade 70 kcal for a better carbohydrate figure, which is
       the wrong trade. */
    const dk = Math.abs(t.k - target.k);
    score += (dk + Math.max(0, dk - KCAL_FREE) ** 2 * 0.5) * PERSON_WEIGHT[who];

    /* Calories alone are not the plan. Scoring only kcal let days land within
       1% of target while carbohydrate ran 18% over and fat 17% under — the
       right number of calories in the wrong shape. Carbohydrate and fat are
       scored on their distance from target too, weighted so they steer the
       choice without ever outvoting the calorie figure. */
    score += Math.abs(t.c - target.c) * CARB_WEIGHT * PERSON_WEIGHT[who];
    score += Math.abs(t.f - target.f) * FAT_WEIGHT * PERSON_WEIGHT[who];

    if (t.p > b.pMax) { score += (t.p - b.pMax) * 12; notes.push(`${name} runs to ${Math.round(t.p)} g protein`); }
    if (t.f > b.fMax) { score += (t.f - b.fMax) * 14; notes.push(`${name} runs to ${Math.round(t.f)} g fat`); }
    if (t.fb < b.fbMin) { score += (b.fbMin - t.fb) * 10; notes.push(`${name} gets only ${Math.round(t.fb)} g fibre`); }
    /* Protein above target is the point of the plan, so reward it gently. */
    score -= Math.min(t.p - target.p, 25) * 2;
  }

  score += repeatCost(req.recent?.b, core[0]!);
  score += repeatCost(req.recent?.l, core[1]!);
  score += repeatCost(req.recent?.d, core[2]!);
  for (const id of later) score += repeatCost(req.recent?.later, id) * 0.5;

  return { core, later, solved, score, notes: [...new Set(notes)] };
}

/** The best day available from what is switched on, or null when nothing works. */
export function bestDay(req: DayRequest): DayResult | null {
  const B = pool(req, 'b'), L = pool(req, 'l'), D = pool(req, 'd');
  const laterPool = req.laterCount ? pool(req, 'later') : [];
  if (!B.length || !L.length || !D.length) return null;
  if (req.laterCount && !laterPool.length) return null;

  const laterSets: string[][] = req.laterCount
    ? laterPool.map(id => [id]).filter(s => s.length === req.laterCount)
    : [[]];

  let best: DayResult | null = null;
  for (const b of B) for (const l of L) for (const d of D) for (const later of laterSets) {
    const r = scoreDay([b, l, d], later, req);
    if (r && (!best || r.score < best.score)) best = r;
  }
  return best;
}

export interface WeekDayRequest extends DayRequest { index: number; eatingOut: boolean }

export interface WeekResult {
  days: (DayResult | null)[];
  /** The day that could not be balanced, if any. Named, not swallowed. */
  failedOn: number | null;
  missing: string[];
}

/** Build a week, one day at a time, each against its own vegetarian status.
    Deciding one mode per WEEK by majority is the worst defect this project has
    had: weeks 6 and 8 would have served meat on three fasting days. */
export function buildWeek(days: WeekDayRequest[]): WeekResult {
  const out: (DayResult | null)[] = [];
  const recent: Record<'b' | 'l' | 'd' | 'later', string[]> = { b: [], l: [], d: [], later: [] };
  for (const day of days) {
    if (day.eatingOut) { out.push(null); continue; }
    const r = bestDay({ ...day, recent });
    if (!r) return { days: out, failedOn: day.index, missing: missingSlots(day) };
    out.push(r);
    recent.b.push(r.core[0]!); recent.l.push(r.core[1]!); recent.d.push(r.core[2]!);
    recent.later.push(...r.later);
  }
  return { days: out, failedOn: null, missing: [] };
}
