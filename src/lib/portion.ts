/* The portion solver.

   WHY THIS EXISTS
   Handover section 2 records Mrinal's meal pattern as "three meals". The app
   was built with five slots anyway, and Naveen asked for it back: three meals,
   with an optional "you can eat this later" section, because eating six times
   a day was never the ask.

   Dropping the mid-morning shake and the afternoon raita takes her from about
   1,386 kcal and 137 g of protein down to 1,161 and 101. The three remaining
   meals have to grow by roughly a fifth. That is 30 meals x 8 ingredient lines
   of new gram weights, and hand-typing 240 numbers is precisely the error class
   section 14 of the handover documents.

   So the reference weights in data/meals.ts stay exactly as verified, and this
   module scales a meal's SHAPE to whatever budget its slot is given. The same
   mechanism serves section 16.2 — recalculating every portion once three real
   weigh-ins replace the estimated metabolic rates — so it is built once here
   rather than twice later.

   THE RULE IT OBEYS
   Protein first, calories second. A meal that cannot hit both reports the gap
   instead of distorting itself to hide it; solveDay then hands the remainder
   to whichever slot still has room. Nothing is ever silently rounded away. */

import { F } from '../data/foods.ts';
import type { SlotType } from '../data/foods.ts';
import { M } from '../data/meals.ts';
import { PEOPLE, BANDS } from '../data/people.ts';
import type { PersonId } from '../data/people.ts';
import { gramsFor, ratioFor } from './scale.ts';
import { per, rowsTotal, ZERO } from './macros.ts';
import type { Macros, Row, Swaps } from './macros.ts';

/** How far each slot type may move from its verified reference weight.
    Vegetables get a wide band because they are volume; oil gets a narrow one
    because it is measured into a pan and 5 ml is 40 kcal. */
export const BAND: Record<SlotType, [number, number]> = {
  pro: [0.55, 1.90],
  carb: [0.40, 2.40],
  veg: [0.75, 1.60],
  fruit: [0.60, 1.60],
  fat: [0.80, 1.50],
  fix: [0.70, 1.70],
};

/** Absolute ceilings, in Mrinal's grams, for the foods where a band alone is
    not enough. Nobody drinks 60 g of isolate in one go or counts out 30
    almonds; oil past 15 ml stops being a measured tadka. */
export const CEILING: Record<string, number> = {
  whey: 45, almond: 20, oil: 15, ghee: 15, huelb: 120, huelp: 140,
  greek: 260, sains: 260, curd: 260,
};

/** Oil never drops below a real tempering. Dal-heavy days fell to 25 g of fat
    a day — about 0.38 g/kg, under the hormonal floor — before this was fixed. */
export const OIL_FLOOR_ML = 5;

const step = (fid: string): number => (F[fid]!.ml ? 2.5 : 5);
const roundTo = (g: number, s: number): number => Math.max(s, Math.round(g / s) * s);

/** Is this line one of the ones carrying the meal's protein? `fix` lines like
    the Fage and whey beside every dal are protein lines in everything but name
    — the handover is explicit that they are not optional. */
function isProteinLine(fid: string, type: SlotType): boolean {
  if (type === 'pro') return true;
  if (type !== 'fix') return false;
  const o = F[fid]!;
  return o.p * 4 >= Math.max(o.c * 4, o.f * 9) && o.p >= 8;
}

function boundsFor(who: PersonId, fid: string, refG: number, type: SlotType): [number, number] {
  const base = gramsFor(who, fid, refG, type);
  const band = BAND[type];
  let lo = base * band[0];
  let hi = base * band[1];
  const ceil = CEILING[fid];
  if (ceil !== undefined) hi = Math.min(hi, who === 'M' ? ceil : ceil * ratioFor(fid, type));
  if (F[fid]!.ml && type === 'fat') lo = Math.max(lo, OIL_FLOOR_ML);
  return [lo, hi];
}

export interface SolvedMeal {
  mid: string;
  rows: Row[];
  macros: Macros;
  /** What the slot was asked for, minus what it delivered. Positive means short. */
  residual: { k: number; p: number };
}

export interface Budget {
  k: number;
  p: number;
  /** Optional fat ceiling. When protein and fat conflict, protein yields —
      a plate is not improved by carrying 66 g of fat to reach a protein figure. */
  fMax?: number;
}

/** Scale one meal's shape to a slot budget. Returns the reference plate
    untouched when `budget` is omitted — that is how the original five-meal
    mode keeps working, byte for byte. */
export function solveMeal(mid: string, who: PersonId, budget?: Budget, swaps: Swaps = {}): SolvedMeal {
  const base = M[mid];
  if (!base) throw new Error(`solveMeal: unknown meal '${mid}'`);
  /* Swaps are applied to the SHAPE before solving, so a swapped ingredient is
     scaled by the solver like any other rather than being pinned at whatever
     the swap sheet last computed. */
  const meal = {
    ...base,
    x: base.x.map(([fid, g, t], i) => {
      const sw = swaps[i];
      return [sw?.fid ?? fid, sw?.g ?? g, t] as [string, number, typeof t];
    }),
  };

  const refRows: Row[] = meal.x.map(([fid, g, t]) => [fid, gramsFor(who, fid, g, t), t]);
  if (!budget) {
    const macros = rowsTotal(refRows);
    return { mid, rows: refRows, macros, residual: { k: 0, p: 0 } };
  }

  const bounds = meal.x.map(([fid, g, t]) => boundsFor(who, fid, g, t));
  const isPro = meal.x.map(([fid, , t]) => isProteinLine(fid, t));
  const isCarb = meal.x.map(([, , t]) => t === 'carb');
  const isFlex = meal.x.map(([, , t]) => t === 'veg' || t === 'fruit');
  let g = refRows.map(r => r[1]);

  const clamp = (i: number, v: number) => Math.min(bounds[i]![1], Math.max(bounds[i]![0], v));
  const totals = () => rowsTotal(meal.x.map(([fid], i) => [fid, g[i]!, meal.x[i]![2]] as Row));
  const partial = (pick: boolean[], key: keyof Macros) =>
    meal.x.reduce((a, [fid], i) => a + (pick[i] ? per(fid, g[i]!)[key] : 0), 0);

  const scaleGroup = (pick: boolean[], factor: number) => {
    if (!Number.isFinite(factor) || factor <= 0) return;
    for (let i = 0; i < g.length; i++) if (pick[i]) g[i] = clamp(i, g[i]! * factor);
  };

  /* Protein first, then calories. Four passes converge well inside a gram;
     more would be arithmetic theatre. */
  for (let pass = 0; pass < 4; pass++) {
    const pPro = partial(isPro, 'p');
    const pRest = totals().p - pPro;
    if (pPro > 0) scaleGroup(isPro, (budget.p - pRest) / pPro);

    const kCarb = partial(isCarb, 'k');
    const kRest = totals().k - kCarb;
    if (kCarb > 0) scaleGroup(isCarb, (budget.k - kRest) / kCarb);
    else {
      /* No carbohydrate line — a shake, a raita. Fill the gap with volume
         rather than with more protein powder. */
      const kFlex = partial(isFlex, 'k');
      const kOther = totals().k - kFlex;
      if (kFlex > 0) scaleGroup(isFlex, (budget.k - kOther) / kFlex);
    }
  }

  /* Fat guard. On a paneer or tofu day the protein pass can drag fat well past
     target, because the fat rides along with the protein in the same food.
     Protein yields — but never below the reference plate, which was verified. */
  if (budget.fMax !== undefined) {
    for (let pass = 0; pass < 3 && totals().f > budget.fMax; pass++) {
      const fPro = partial(isPro, 'f');
      const fRest = totals().f - fPro;
      if (fPro <= 0) break;
      const want = (budget.fMax - fRest) / fPro;
      if (!(want > 0) || want >= 1) break;
      for (let i = 0; i < g.length; i++) {
        if (!isPro[i]) continue;
        g[i] = Math.max(refRows[i]![1], clamp(i, g[i]! * want));
      }
    }
    /* Pulling the protein back took calories with it. Put them back through the
       carbohydrate — rice and roti carry no fat, which is the whole point. */
    const kCarb = partial(isCarb, 'k');
    if (kCarb > 0) scaleGroup(isCarb, (budget.k - (totals().k - kCarb)) / kCarb);
    else {
      const kFlex = partial(isFlex, 'k');
      if (kFlex > 0) scaleGroup(isFlex, (budget.k - (totals().k - kFlex)) / kFlex);
    }
  }

  g = g.map((v, i) => roundTo(clamp(i, v), step(meal.x[i]![0])));
  const rows: Row[] = meal.x.map(([fid, , t], i) => [fid, g[i]!, t]);
  const macros = rowsTotal(rows);
  return {
    mid, rows, macros,
    residual: { k: Math.round((budget.k - macros.k) * 10) / 10, p: Math.round((budget.p - macros.p) * 10) / 10 },
  };
}

/* ---------------------------------------------------------------- day level */

/* The plan deliberately runs protein above target: 120 g target against about
   139 g delivered for Mrinal, 140 against 167 for Ramesh (handover section 3).
   That surplus is the whole point — it is what makes the six kilograms lost
   fat rather than muscle — so the solver aims at the delivered figure, not the
   target, or the restructure would quietly undo it. */
export const PROTEIN_AIM: Record<PersonId, number> = { M: 139, R: 167 };

/** How the day's calories divide. Roughly the split the verified reference
    plates already use, with lunch the largest because it is the cooked meal. */
export const CORE_SHARE: Record<'b' | 'l' | 'd', number> = { b: 0.32, l: 0.36, d: 0.32 };
/** One optional item takes a tenth of the day — about 140 kcal for her, 180 for
    him, which is the size the existing snacks already are. */
export const LATER_SHARE = 0.10;

export interface DaySolution {
  meals: SolvedMeal[];
  total: Macros;
  target: Budget;
  /** Target minus delivered, after redistribution. Shown, never hidden. */
  residual: { k: number; p: number };
}

/**
 * Solve a whole day.
 *
 * `core` is the three meals, in b/l/d order. `later` is zero or more optional
 * items. The day's calorie and protein budget is fixed: adding a later item
 * takes its share OUT of the three meals rather than on top of them, so the
 * daily total is the same either way. That was Naveen's explicit choice.
 *
 * Pass `mode: 'reference'` to get the verified plates untouched — the original
 * five-meal behaviour.
 */
export function solveDay(
  core: string[], later: string[], who: PersonId,
  mode: 'solved' | 'reference' = 'solved',
): DaySolution {
  const target: Budget = { k: PEOPLE[who].t.k, p: PROTEIN_AIM[who] };

  if (mode === 'reference') {
    const meals = [...core, ...later].map(mid => solveMeal(mid, who));
    const total = meals.reduce((a, m) => ({
      k: a.k + m.macros.k, p: a.p + m.macros.p, c: a.c + m.macros.c,
      f: a.f + m.macros.f, fb: a.fb + m.macros.fb,
    }), ZERO);
    return { meals, total, target, residual: { k: target.k - total.k, p: target.p - total.p } };
  }

  const laterTotal = later.length * LATER_SHARE;
  const coreScale = 1 - laterTotal;
  const keys: ('b' | 'l' | 'd')[] = ['b', 'l', 'd'];
  const shares = [
    ...core.map((_, i) => CORE_SHARE[keys[i] ?? 'l'] * coreScale),
    ...later.map(() => LATER_SHARE),
  ];
  const ids = [...core, ...later];

  const fMax = BANDS[who].fMax;
  let solved = ids.map((mid, i) => solveMeal(mid, who, {
    k: target.k * shares[i]!, p: target.p * shares[i]!, fMax: fMax * shares[i]!,
  }));

  /* Redistribute. A whey shake cannot absorb 140 kcal without becoming 38 g of
     isolate, so what it could not take is handed to the slots that still have
     room, weighted by how much room each has left. Two rounds is enough. */
  for (let round = 0; round < 2; round++) {
    const total = solved.reduce((a, m) => ({ k: a.k + m.macros.k, p: a.p + m.macros.p }), { k: 0, p: 0 });
    const gapK = target.k - total.k, gapP = target.p - total.p;
    if (Math.abs(gapK) < 5 && Math.abs(gapP) < 1) break;
    const room = solved.map(m => (gapK > 0 ? Math.max(0, -m.residual.k) + 1 : Math.max(0, m.residual.k) + 1));
    const roomSum = room.reduce((a, b) => a + b, 0);
    solved = solved.map((m, i) => solveMeal(m.mid, who, {
      k: m.macros.k + (gapK * room[i]!) / roomSum,
      p: m.macros.p + (gapP * room[i]!) / roomSum,
      fMax: fMax * shares[i]!,
    }));
  }

  const total = solved.reduce((a, m) => ({
    k: a.k + m.macros.k, p: a.p + m.macros.p, c: a.c + m.macros.c,
    f: a.f + m.macros.f, fb: a.fb + m.macros.fb,
  }), ZERO);
  return {
    meals: solved, total, target,
    residual: { k: Math.round(target.k - total.k), p: Math.round((target.p - total.p) * 10) / 10 },
  };
}
