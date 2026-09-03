/* The shopping list.

   Generated from the days actually chosen, both plates summed, then rounded to
   real pack sizes. It is not a static list — changing a meal moves it. */

import { F } from '../data/foods.ts';
import type { Food } from '../data/foods.ts';
import { gramsFor } from './scale.ts';
import type { Row } from './macros.ts';

/* ------------------------------------------------------------ pack solving */

/** A 3% shortfall is fine. Portions are weighed to 5 g and nobody runs out over
    two grams a day. Buying a whole extra bag to cover it is the worse error. */
export const SHORTFALL_TOLERANCE = 0.97;
export const MAX_PACKS = 4;

export interface Combo { total: number; counts: Record<number, number> }

/**
 * Cover the need with the fewest packs, then the least waste.
 *
 * Both halves of that ordering were learned the hard way. A greedy
 * largest-first fill gave "1 box of 6 + 1 of 10 + 1 of 15" for 26 eggs.
 * Minimising waste alone gave four separate tubs of yoghurt to save 20 g.
 */
export function bestCombo(need: number, sizes: readonly number[]): Combo {
  const s = [...new Set(sizes)].sort((a, b) => b - a);
  const target = need * SHORTFALL_TOLERANCE;
  let best: { total: number; waste: number; n: number; picked: number[] } | null = null;

  const walk = (i: number, total: number, picked: number[]): void => {
    if (best && picked.length > best.n) return;
    if (picked.length > MAX_PACKS) return;
    if (total >= target) {
      const cand = { total, waste: Math.max(0, total - need), n: picked.length, picked: [...picked] };
      if (!best || cand.n < best.n || (cand.n === best.n && cand.waste < best.waste)) best = cand;
      return;
    }
    if (i >= s.length) return;
    walk(i, total + s[i]!, [...picked, s[i]!]);
    walk(i + 1, total, picked);
  };
  walk(0, 0, []);

  if (!best) {
    const k = Math.ceil(need / s[0]!);
    best = { total: k * s[0]!, waste: 0, n: k, picked: Array(k).fill(s[0]!) };
  }
  const counts: Record<number, number> = {};
  for (const x of (best as { picked: number[] }).picked) counts[x] = (counts[x] ?? 0) + 1;
  return { total: (best as { total: number }).total, counts };
}

/* Oil is bought and measured in millilitres. Showing "280 g" on the list beside
   "7.5 ml" on the plate made two different units look like the same number —
   they are not: oil is about 0.92 g/ml. */
const size = (n: number, ml = false): string =>
  ml ? (n >= 1000 ? `${n / 1000} litre${n === 1000 ? '' : 's'}` : `${n} ml`)
     : (n >= 1000 ? `${n / 1000} kg` : `${n} g`);

/** How much of this food, in its own unit. */
export const amountOf = (fid: string, n: number): string => size(n, Boolean(F[fid]?.ml));

export interface PackPlan {
  /** What ends up in the trolley, in grams. */
  buy: number;
  /** How many individual items, for the eleven things sold by the unit. */
  count?: number;
  /** Plain words: "2 boxes of 12 + 1 box of 6", or "1 x 5 kg". */
  note: string;
  /** Grams short of the need, when the tolerance was used. Shown on the line.
      2.65 kg of chicken becomes "1 x 1 kg + 1 x 1.6 kg", which is 50 g under —
      because the alternative is a third pack to cover fifty grams. That is the
      right trade, but it was silent, and a silent shortfall is indistinguishable
      from a bug. */
  short?: number;
}

/** Round a weekly need up to what is actually on the shelf. */
export function packUp(fid: string, g: number): PackPlan {
  const o = F[fid];
  if (!o) throw new Error(`packUp: unknown food '${fid}'`);

  /* Count what is counted. Nobody buys eggs by the kilogram, and the list once
     said "1.29 kg — buy 3 x 600 g". */
  if (o.unit) {
    const n = Math.max(1, Math.ceil(g / o.unit.g));
    const label = `${n} ${n === 1 ? o.unit.s : o.unit.p}`;
    if (o.unit.box) {
      const c = bestCombo(n, o.unit.box);
      const how = Object.entries(c.counts)
        .map(([b, k]) => `${k} box${k > 1 ? 'es' : ''} of ${b}`).join(' + ');
      return { buy: n * o.unit.g, count: n, note: `${label} — ${how}` };
    }
    return { buy: n * o.unit.g, count: n, note: label };
  }

  if (o.packs) {
    const c = bestCombo(g, o.packs);
    const how = Object.entries(c.counts).map(([sz, k]) => `${k} × ${size(Number(sz), Boolean(o.ml))}`).join(' + ');
    const under = Math.round(g - c.total);
    return under > 0 ? { buy: c.total, note: how, short: under } : { buy: c.total, note: how };
  }

  if (o.pack) {
    const n = Math.max(1, Math.ceil(g / o.pack));
    return { buy: n * o.pack, note: `${n} × ${size(o.pack, Boolean(o.ml))}` };
  }

  return { buy: Math.ceil(g / 50) * 50, note: '' };
}

/* ------------------------------------------------------------ the list */

/** Both plates, summed across the days actually being cooked. */
export function weekNeeds(days: { rows: Row[] }[][]): Record<string, number> {
  const need: Record<string, number> = {};
  for (const day of days)
    for (const meal of day)
      for (const [fid, g, type] of meal.rows)
        need[fid] = (need[fid] ?? 0) + g + gramsFor('R', fid, g, type);
  return need;
}

/** Already summed for both people — for lists built from a solved day, where
    each person's rows are separate. */
export function addRows(need: Record<string, number>, rows: Row[]): void {
  for (const [fid, g] of rows) need[fid] = (need[fid] ?? 0) + g;
}

export type Group = 'super-main' | 'super-fresh' | 'indian-main' | 'indian-fresh';

export const GROUP_LABEL: Record<Group, string> = {
  'super-main': 'Supermarket — main shop',
  'super-fresh': 'Supermarket — midweek top-up',
  'indian-main': 'Indian grocer — main shop',
  'indian-fresh': 'Indian grocer — midweek top-up',
};

export const GROUP_NOTE: Record<Group, string> = {
  'super-main': 'Chicken, dairy, frozen fish, tins — anything that keeps the week out.',
  'super-fresh': 'Salad and soft greens. Buying these on Monday means binning them on Friday.',
  'indian-main': 'Paneer, atta, dals, soya, rice. Cheaper here, and the bags last months.',
  'indian-fresh': 'Fresh paneer and the gourds.',
};

/* Midweek means perishable AND not freezable. Frozen fish is bought on Monday
   with everything else; salad and soft greens are not, because buying those on
   Monday means binning them on Friday.

   KNOWN DISCREPANCY, carried forward deliberately. Handover section 12.1 lists
   chicken under "Supermarket, main shop". The data marks it fresh with no
   frozenok flag, so this rule puts it on the midweek trip — and the legacy app
   did the same, so this is not a regression. Chicken breast freezes perfectly
   well and the document is probably right, but flipping it means editing a
   sourced food record, which is Naveen's call and not a silent one.
   See DECISIONS.md. */
export const groupOf = (o: Food): Group => {
  const midweek = Boolean(o.fresh) && !o.frozenok;
  return o.shop === 'indian'
    ? (midweek ? 'indian-fresh' : 'indian-main')
    : (midweek ? 'super-fresh' : 'super-main');
};

export interface ListRow {
  fid: string;
  name: string;
  need: number;
  pack: PackPlan;
  group: Group;
  /** £ per kg where known — researched or entered. Never estimated. */
  price?: number;
  /** True when the price came from a real listing rather than the user. */
  approx: boolean;
  owned: boolean;
}

export interface ShoppingList {
  rows: ListRow[];
  owned: ListRow[];
  groups: Record<Group, ListRow[]>;
  /** Only produced when EVERY line is priced. A partial total built on a third
      of the data misleads more than no total at all. */
  total: number | null;
  unpriced: number;
}

export function buildList(
  need: Record<string, number>,
  opts: { have?: Record<string, boolean>; prices?: Record<string, number> } = {},
): ShoppingList {
  const rows: ListRow[] = [];
  const owned: ListRow[] = [];
  for (const [fid, g] of Object.entries(need)) {
    const o = F[fid];
    if (!o || g <= 0) continue;
    const entered = opts.prices?.[fid];
    const row: ListRow = {
      fid, name: o.n, need: g, pack: packUp(fid, g), group: groupOf(o),
      price: entered ?? o.cost, approx: entered === undefined && o.cost !== undefined,
      owned: opts.have?.[fid] === true,
    };
    (row.owned ? owned : rows).push(row);
  }
  rows.sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
  owned.sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));

  const groups = { 'super-main': [], 'super-fresh': [], 'indian-main': [], 'indian-fresh': [] } as Record<Group, ListRow[]>;
  for (const r of rows) groups[r.group].push(r);

  const unpriced = rows.filter(r => r.price === undefined).length;
  const total = unpriced === 0
    ? rows.reduce((a, r) => a + (r.price! * r.pack.buy) / 1000, 0)
    : null;
  return { rows, owned, groups, total, unpriced };
}

export const money = (n: number): string => `£${n.toFixed(2)}`;

/** How many weeks a pack lasts at this rate of use. The strongest argument for
    the inventory layer: only 19 of the 25 items on a normal week are weekly. */
export const packLife = (fid: string, weeklyNeed: number): number | null => {
  const o = F[fid];
  const biggest = o?.packs?.[0] ?? o?.pack;
  if (!biggest || weeklyNeed <= 0) return null;
  return biggest / weeklyNeed;
};
