/* One pan, two plates.

   Mrinal cooks once. Every ingredient line shows three figures: what goes in
   the pan, then each plate. She weighs the pan total, cooks it as one dish,
   then weighs the two plates separately before anyone sits down.

   The multiplier is per macro role, not per plate — see SCALE in data/people.ts
   for why a single 1.27x is wrong. */

import { F } from '../data/foods.ts';
import type { SlotType } from '../data/foods.ts';
import { SCALE } from '../data/people.ts';
import type { PersonId } from '../data/people.ts';

/** The multiplier for one ingredient. `fix` lines follow whichever macro carries
    most of their energy, so aromatics scale with the dish they belong to. */
export function ratioFor(fid: string, type: SlotType): number {
  const named = SCALE[type];
  if (named !== undefined) return named;
  const o = F[fid];
  if (!o) throw new Error(`ratioFor: unknown food '${fid}'`);
  const m = Math.max(o.p * 4, o.c * 4, o.f * 9);
  return m === o.p * 4 ? SCALE.pro! : m === o.f * 9 ? SCALE.fat! : SCALE.carb!;
}

/** Rounded to the nearest 5 g, or 2.5 ml for anything measured by volume.
    A kitchen scale does not do fractions of a gram and neither should the app. */
export function gramsFor(who: PersonId, fid: string, g: number, type: SlotType): number {
  if (who === 'M') return g;
  const o = F[fid];
  if (!o) throw new Error(`gramsFor: unknown food '${fid}'`);
  const step = o.ml ? 2.5 : 5;
  return Math.max(step, Math.round((g * ratioFor(fid, type)) / step) * step);
}

/** What goes into the pan: both plates added together. */
export const panFor = (fid: string, g: number, type: SlotType): number =>
  g + gramsFor('R', fid, g, type);
