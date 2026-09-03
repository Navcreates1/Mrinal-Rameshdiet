/* Every gram figure in the app is computed from data/foods.ts. Nothing derived
   is stored, so a corrected composition value moves every screen at once. */

import { F } from '../data/foods.ts';
import type { SlotType } from '../data/foods.ts';
import { M } from '../data/meals.ts';
import { gramsFor } from './scale.ts';
import type { PersonId } from '../data/people.ts';

export interface Macros { k: number; p: number; c: number; f: number; fb: number }

export const ZERO: Macros = { k: 0, p: 0, c: 0, f: 0, fb: 0 };

export function per(fid: string, g: number): Macros {
  const o = F[fid];
  if (!o) throw new Error(`per: unknown food '${fid}'`);
  return { k: o.k * g / 100, p: o.p * g / 100, c: o.c * g / 100, f: o.f * g / 100, fb: o.fb * g / 100 };
}

export const add = (a: Macros, b: Macros): Macros =>
  ({ k: a.k + b.k, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f, fb: a.fb + b.fb });

export const sum = (xs: Macros[]): Macros => xs.reduce(add, ZERO);

export type Row = [fid: string, grams: number, type: SlotType];

/** A meal's ingredient rows for one person, with any swaps already applied. */
export function mealRows(mid: string, who: PersonId, swaps: Record<number, string> = {}): Row[] {
  const meal = M[mid];
  if (!meal) throw new Error(`mealRows: unknown meal '${mid}'`);
  return meal.x.map(([fid, g, t], i) => {
    const to = swaps[i];
    const f = to ?? fid;
    return [f, gramsFor(who, f, g, t), t] as Row;
  });
}

export const rowsTotal = (rows: Row[]): Macros => sum(rows.map(([fid, g]) => per(fid, g)));

export const mealTotal = (mid: string, who: PersonId, swaps?: Record<number, string>): Macros =>
  rowsTotal(mealRows(mid, who, swaps));

export const dayTotal = (ids: string[], who: PersonId): Macros =>
  sum(ids.map(id => mealTotal(id, who)));

/** What a raw or dry weight becomes once cooked, for the on-screen check.
    Getting raw-versus-cooked backwards is roughly a 200 kcal daily error,
    which is the entire deficit — so it is stated on the line, not in a footnote. */
export function cookedWeight(fid: string, g: number): { g: number; verb: string } | null {
  const o = F[fid];
  if (!o?.w || !o.cv) return null;
  return { g: Math.round(g * o.cv), verb: o.cv < 1 ? 'shrinks to' : 'swells to' };
}
