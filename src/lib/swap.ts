/* The swap engine.

   It preserves the macro ROLE, not the gram weight: swapping 145 g of chicken
   for whey rescales to match the protein it replaced, so the day stays on
   target. Every option is computed from the food database, which is why lunch
   alone yields over two thousand valid combinations and all of them are
   arithmetically right. */

import { F } from '../data/foods.ts';
import type { SlotType } from '../data/foods.ts';
import { poolFor } from '../data/pools.ts';
import { M as MEALS } from '../data/meals.ts';
import { per } from './macros.ts';

/** Energy cap on a swap: 1.3x the original plus 30 kcal.
    Matching a macro alone breaks on fat-heavy foods — matching chicken's
    protein with whole egg gives 261 g of egg and +220 kcal, which is half the
    day's deficit spent on a swap that looked like a fair trade. */
export const ENERGY_CAP_MULT = 1.3;
export const ENERGY_CAP_ADD = 30;
export const MAX_GRAMS = 500;
export const MAX_ML = 60;

export function swapGrams(type: SlotType, oldFid: string, oldG: number, newFid: string): number {
  const o = F[oldFid], n = F[newFid];
  if (!o || !n) throw new Error(`swapGrams: unknown food '${!o ? oldFid : newFid}'`);
  let g = oldG;
  if (type === 'pro' && n.p > 0) g = (o.p * oldG) / n.p;
  else if ((type === 'carb' || type === 'fruit') && n.c > 0) g = (o.c * oldG) / n.c;
  if (n.k > 0) {
    const cap = (((o.k * oldG) / 100) * ENERGY_CAP_MULT + ENERGY_CAP_ADD) / n.k * 100;
    g = Math.min(g, cap);
  }
  const r = Math.max(5, Math.round(g / 5) * 5);
  return Math.min(r, n.ml ? MAX_ML : MAX_GRAMS);
}

/** Build the record that mealRows consumes: the new food AND its rescaled
    reference weight, so the two can never drift apart. */
export function makeSwap(mid: string, index: number, toFid: string): { fid: string; g: number } {
  const meal = MEALS[mid];
  if (!meal) throw new Error(`makeSwap: unknown meal '${mid}'`);
  const line = meal.x[index];
  if (!line) throw new Error(`makeSwap: ${mid} has no ingredient at index ${index}`);
  const [fid, g, type] = line;
  return { fid: toFid, g: swapGrams(type, fid, g, toFid) };
}

export interface SwapOption {
  fid: string;
  name: string;
  grams: number;
  dk: number;   // change in kcal against what it replaces
  dp: number;   // change in protein
  current: boolean;
}

/** Every option for one ingredient line, with the cost of each shown BEFORE it
    is chosen. Sorted by protein, densest first. */
export function swapOptions(
  type: SlotType, fid: string, grams: number, vegetarianDay: boolean,
): SwapOption[] {
  const was = per(fid, grams);
  return poolFor(type, vegetarianDay)
    .map(to => {
      const g = to === fid ? grams : swapGrams(type, fid, grams, to);
      const now = per(to, g);
      return {
        fid: to, name: F[to]!.n, grams: g,
        dk: Math.round(now.k - was.k), dp: Math.round((now.p - was.p) * 10) / 10,
        current: to === fid,
      };
    })
    .sort((a, b) => (b.current ? 1 : 0) - (a.current ? 1 : 0) || b.dp - a.dp);
}
