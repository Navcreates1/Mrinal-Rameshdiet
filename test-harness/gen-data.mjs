/* gen-data.mjs — write src/data/{foods,meals}.ts FROM goldens.json.
   Generated, never retyped. Retyping 63 foods x 12 fields and 30 meals x 8
   ingredients by hand is exactly the error class section 14 of the handover
   documents. Run once at P1; after that the .ts files are the source of truth
   and datalock.ts proves they still agree with the fixture. */
import fs from 'node:fs';
const g = JSON.parse(fs.readFileSync('test-harness/goldens.json', 'utf8'));

const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const num = n => (Number.isInteger(n) ? String(n) : String(n));

/* field order is fixed so the generated file diffs cleanly */
const ORDER = ['n', 's', 'k', 'p', 'c', 'f', 'fb', 'v', 'i', 'w', 'cv', 'ml', 'shop',
               'fresh', 'frozenok', 'unit', 'packs', 'pack', 'cost', 'psrc', 'src',
               'weak', 'srcd'];

function foodLine(id, o) {
  const parts = [];
  for (const k of ORDER) {
    if (o[k] === undefined) continue;
    const v = o[k];
    if (k === 'unit') {
      const u = ['g: ' + v.g, 's: ' + q(v.s), 'p: ' + q(v.p)];
      if (v.box) u.push('box: [' + v.box.join(', ') + ']');
      parts.push('unit: { ' + u.join(', ') + ' }');
    } else if (Array.isArray(v)) parts.push(k + ': [' + v.join(', ') + ']');
    else if (typeof v === 'number') parts.push(k + ': ' + num(v));
    else parts.push(k + ': ' + q(v));
  }
  return `  ${id}: { ${parts.join(', ')} },`;
}

const slotOf = {};
for (const type of ['nv', 'v'])
  for (const [slot, ids] of Object.entries(g.ROT[type])) for (const id of ids) slotOf[id] = slot;

const foods = `/* GENERATED from test-harness/goldens.json by gen-data.mjs — then owned by hand.
   Every value is per 100 g, except items carrying \`ml: 1\` which are per 100 ml.

   src   composition source. USDA FoodData Central, IFCT 2017 (ICMR-NIN, via
         sources citing it — the PDF is not machine-readable), UK CoFID, or a
         manufacturer label.
   weak  the VERIFY flag: aggregator-sourced or the sources disagree. Thirteen
         of the sixty-three. Shown on screen, never silently smoothed over.
   cost  £ per kilogram, and ONLY where a real price was found. Seven of them.
         Nothing here is estimated — see handover section 13 for why that rule
         exists. An absent cost means the app shows "add", not a guess.
   w/cv  must be weighed raw or dry; cv is what it becomes cooked. Getting this
         backwards is a ~200 kcal daily error, which is the entire deficit. */

export type SlotType = 'pro' | 'carb' | 'veg' | 'fruit' | 'fat' | 'fix';

export interface Unit {
  g: number;      // grams in one of them
  s: string;      // singular noun
  p: string;      // plural noun
  box?: number[]; // box sizes it is sold in, largest first
}

export interface Food {
  n: string; s: string;
  k: number; p: number; c: number; f: number; fb: number;
  v: 0 | 1;              // allowed on a vegetarian day
  i: string;             // sprite id
  w?: 'raw' | 'dry';     // weigh it in this state
  cv?: number;           // multiply raw/dry weight by this to get cooked
  ml?: 1;                // measured in millilitres, not grams
  shop?: 'indian';       // cheaper at the Indian grocer
  fresh?: 1;             // buy on the midweek top-up, not Monday
  frozenok?: 1;
  unit?: Unit;           // sold by the item — nobody buys eggs by the kilogram
  packs?: number[];      // real shelf sizes, largest first
  pack?: number;         // sold in exactly one size
  cost?: number;         // £/kg — researched only, never estimated
  psrc?: string;         // the listing that price came from
  src: string;
  weak?: 1;              // VERIFY
  srcd?: 1;
}

export const F: Record<string, Food> = {
${Object.entries(g.F).map(([id, o]) => foodLine(id, o)).join('\n')}
};

export const FOOD_IDS = Object.keys(F);

/** Foods that must be weighed raw or dry. Sixteen of them. */
export const WEIGHED = FOOD_IDS.filter(id => F[id]!.w);
/** Aggregator-sourced or disputed. Thirteen. Flagged on screen. */
export const VERIFY = FOOD_IDS.filter(id => F[id]!.weak);
/** Sold by the item. Eleven. */
export const COUNTABLE = FOOD_IDS.filter(id => F[id]!.unit);
/** Carry a researched price. Seven. */
export const PRICED = FOOD_IDS.filter(id => F[id]!.cost !== undefined);
`;

const meals = `/* GENERATED from test-harness/goldens.json by gen-data.mjs — then owned by hand.

   Quantities in \`x\` are Mrinal's REFERENCE portion: the weights the handover
   was verified against. They are the seed the portion solver scales from, not
   a fixed prescription — see src/lib/portion.ts.

   The tag on each ingredient drives the swap engine and the scaling:
     pro   protein     carb  carbohydrate   veg  vegetable
     fruit fruit       fat   oil            fix  aromatics and sides, not swappable */

import type { SlotType } from './foods.ts';

/** Where a dish sits in the day. \`mm\` and \`s\` are the optional "later" pair. */
export type MealSlot = 'b' | 'mm' | 'l' | 's' | 'd';

/** The three that make a day. Handover section 2: her pattern is three meals. */
export const CORE_SLOTS: MealSlot[] = ['b', 'l', 'd'];
/** Optional, off by default. Eating six times a day was never the ask. */
export const LATER_SLOTS: MealSlot[] = ['mm', 's'];

export interface Meal {
  t: string;                              // title
  v: 0 | 1;                               // safe on a vegetarian day
  ic: string;                             // sprite id
  slot: MealSlot;
  x: [string, number, SlotType][];        // [food id, Mrinal's reference grams, tag]
  m: string[];                            // method, one step per line
}

export const M: Record<string, Meal> = {
${Object.entries(g.M).map(([id, m]) => {
  const x = m.x.map(([f, gg, t]) => `[${q(f)}, ${num(gg)}, ${q(t)}]`).join(', ');
  const method = m.m.map(s => '      ' + q(s)).join(',\n');
  return `  ${id}: {\n    t: ${q(m.t)}, v: ${m.v}, ic: ${q(m.ic)}, slot: ${q(slotOf[id])},\n    x: [${x}],\n    m: [\n${method},\n    ],\n  },`;
}).join('\n')}
};

export const MEAL_IDS = Object.keys(M);

/** Dishes built on a pulse. Never two of these in one day — it overloads carbohydrate. */
export const PULSE = ['moong', 'toor', 'masoor', 'chanadal', 'rajma', 'chana', 'soya'];
export const isPulse = (id: string): boolean =>
  M[id]!.x.some(([f, , t]) => t === 'pro' && PULSE.includes(f));
`;

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/foods.ts', foods);
fs.writeFileSync('src/data/meals.ts', meals);
console.log('src/data/foods.ts  ', foods.length, 'bytes');
console.log('src/data/meals.ts  ', meals.length, 'bytes');
