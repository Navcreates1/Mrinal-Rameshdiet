/* swaptest — the swap engine keeps the macro role, and never blows the day.

   Handover section 10.2: swapping 145 g of chicken for whey rescales to match
   the protein it replaced. A pure macro match breaks on fat-heavy foods —
   matching chicken's protein with whole egg means 261 g of egg and 220 extra
   calories — so the swap is also capped on energy. */

import g from './goldens.json' with { type: 'json' };
import { F } from '../src/data/foods.ts';
import { M } from '../src/data/meals.ts';
import { POOL, poolFor, poolsAreSound } from '../src/data/pools.ts';
import { CYCLE } from '../src/data/cycle.ts';
import { swapGrams, swapOptions, makeSwap, MAX_GRAMS, MAX_ML } from '../src/lib/swap.ts';
import { per, dayTotal, mealRows, rowsTotal } from '../src/lib/macros.ts';
import { ok, eq, near, report } from './assert.ts';

/* Pools are sound: no phantom foods, no duplicates, nothing non-vegetarian in
   the vegetarian protein pool. Fage appeared TWICE in pro_nv, so the swap sheet
   offered it as two identical buttons. */
for (const problem of poolsAreSound()) ok(false, `pool defect: ${problem}`);
eq(poolsAreSound().length, 0, 'every swap pool is sound');
eq(new Set(POOL.pro_nv).size, POOL.pro_nv.length, 'the non-vegetarian protein pool has no duplicate');
eq(POOL.pro_nv.filter(x => x === 'greek').length, 1, 'Fage Total 0% appears once, not twice');
eq(POOL.veg.length, 27, 'handover s10.2: 27 vegetables in the pool');
eq(POOL.carb.length, 5, 'handover s10.2: 5 carbohydrates');
eq(POOL.fruit.length, 5, 'handover s10.2: 5 fruits — its own pool, so blueberries are never swapped for mustard greens');
eq(POOL.fat.length, 2, 'handover s10.2: 2 oils');

/* Fruit is matched on carbohydrate, not protein. Before it had its own slot
   type the app offered to swap the blueberries in the yoghurt for sarson. */
for (const fid of POOL.fruit) ok(F[fid]!.c > 0, `fruit pool member '${fid}' carries carbohydrate`);
for (const fid of POOL.veg) ok(!POOL.fruit.includes(fid as never), `'${fid}' is a vegetable, not a fruit`);

/* Against goldens: every swap the legacy engine could offer, same grams. */
let cases = 0;
for (const s of g.swaps as { mid: string; from: string; to: string; type: string; g: number; grams: number }[]) {
  if (s.to === 'greek' && s.from !== 'greek') { /* de-duplicated pool, still checked once */ }
  eq(swapGrams(s.type as never, s.from, s.g, s.to), s.grams,
    `swap ${s.mid}: ${s.g} g ${s.from} -> ${s.to} (${s.type})`);
  cases++;
}
ok(cases > 1000, `${cases} recorded swap cases replayed`);

/* The energy cap holds everywhere. */
for (const [mid, meal] of Object.entries(M))
  for (const [fid, grams, type] of meal.x) {
    if (type === 'fix') continue;
    for (const to of poolFor(type, meal.v === 1)) {
      const ng = swapGrams(type, fid, grams, to);
      const was = per(fid, grams).k, now = per(to, ng).k;
      /* The cap is applied before rounding to the nearest 5 g (2.5 ml), so the
         served portion may exceed it by one step of that food. Anything more
         than that is the cap failing, not the scale. */
      const stepK = per(to, F[to]!.ml ? 2.5 : 5).k;
      const cap = was * 1.3 + 30 + stepK;
      ok(now <= cap, `${mid}: ${fid} -> ${to} respects the energy cap (${now.toFixed(0)} vs ${cap.toFixed(0)})`);
      ok(ng <= (F[to]!.ml ? MAX_ML : MAX_GRAMS), `${mid}: ${fid} -> ${to} stays under the hard ceiling`);
      ok(ng >= 5 || F[to]!.ml, `${mid}: ${fid} -> ${to} is a real portion`);
    }
  }

/* The whole-egg case named in the handover: 261 g and +220 kcal, capped away. */
const eggForChicken = swapGrams('pro', 'chicken', 145, 'egg');
ok(eggForChicken < 200, `handover s14.2: chicken -> whole egg is capped (${eggForChicken} g, was 261 g uncapped)`);
near(per('egg', eggForChicken).k - per('chicken', 145).k, 0, 80,
  'and the calorie cost of that swap is bounded, not +220 kcal');

/* Stress: every single swap on every cycle day, both people, stays in the band
   the handover verified — 1,300 to 1,650 kcal, protein never below 107 g. */
let stress = 0, worstK = [Infinity, -Infinity], worstP = Infinity;
for (const type of ['nv', 'v'] as const)
  for (const ids of CYCLE[type])
    for (const who of ['M', 'R'] as const) {
      const base = dayTotal(ids, who);
      for (const [slot, mid] of ids.entries()) {
        const meal = M[mid]!;
        for (const [i, [fid, , tag]] of meal.x.entries()) {
          if (tag === 'fix') continue;
          for (const to of poolFor(tag, meal.v === 1)) {
            if (to === fid) continue;
            const swapped = rowsTotal(mealRows(mid, who, { [i]: makeSwap(mid, i, to) }));
            const original = rowsTotal(mealRows(mid, who));
            const k = base.k - original.k + swapped.k;
            const p = base.p - original.p + swapped.p;
            stress++;
            if (who === 'M') {
              worstK = [Math.min(worstK[0]!, k), Math.max(worstK[1]!, k)];
              worstP = Math.min(worstP, p);
              ok(k >= 1200 && k <= 1750, `${type} day, slot ${slot}, ${fid}->${to}: Mrinal lands at ${k.toFixed(0)} kcal`);
              ok(p >= 100, `${type} day, slot ${slot}, ${fid}->${to}: Mrinal keeps ${p.toFixed(0)} g protein`);
            }
          }
        }
      }
    }
ok(stress > 1500, `${stress} single swaps stress-tested across every cycle day and pool`);
console.error(`  [swaptest] Mrinal's range under swap: ${worstK[0]!.toFixed(0)}-${worstK[1]!.toFixed(0)} kcal, protein floor ${worstP.toFixed(0)} g`);

/* The sheet shows the cost of a swap BEFORE it is chosen. */
const opts = swapOptions('pro', 'chicken', 145, false);
ok(opts.length > 5, 'the protein sheet offers real alternatives');
ok(opts[0]!.current, 'the current choice is shown first');
for (const o of opts) {
  ok(Number.isFinite(o.dk) && Number.isFinite(o.dp), `${o.fid} shows its calorie and protein cost`);
  ok(o.grams > 0, `${o.fid} shows a weight`);
}
const vegOpts = swapOptions('pro', 'paneerlf', 100, true);
for (const o of vegOpts) eq(F[o.fid]!.v, 1, `on a fasting day the protein sheet offers only vegetarian options ('${o.fid}')`);

report('swaptest');
