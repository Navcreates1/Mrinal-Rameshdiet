/* macrotest — the verified five-meal plates still add up to what they did.

   This is the P1 lock: the refactor moved the data into modules and the maths
   into pure functions, and this proves it changed no number. The reference mode
   of the portion solver must return the handover's plates untouched. */

import g from './goldens.json' with { type: 'json' };
import { CYCLE, FIXED } from '../src/data/cycle.ts';
import { PEOPLE, BANDS } from '../src/data/people.ts';
import { dayTotal, mealTotal } from '../src/lib/macros.ts';
import { solveDay } from '../src/lib/portion.ts';
import { ok, eq, near, deep, report } from './assert.ts';

const WHO = ['M', 'R'] as const;

/* The two cycles are exactly as searched. Changing one is a deliberate act. */
for (const type of ['nv', 'v'] as const) {
  deep(CYCLE[type], g.CYCLE[type], `cycle ${type} is unchanged`);
  eq(CYCLE[type].length, 7, `cycle ${type} is seven days`);
  for (const ids of CYCLE[type]) eq(ids.length, 5, `cycle ${type} days hold five meals`);
}
deep(FIXED, g.FIXED, 'the fixed plate is unchanged');

/* Every cycle day, both people, against goldens to four decimal places. */
for (const type of ['nv', 'v'] as const) {
  g.cycles[type].forEach((want: any, i: number) => {
    const ids = CYCLE[type][i]!;
    for (const who of WHO) {
      const t = dayTotal(ids, who), e = want[who];
      near(t.k, e.k, 0.001, `${type} day ${i + 1} kcal for ${who}`);
      near(t.p, e.p, 0.001, `${type} day ${i + 1} protein for ${who}`);
      near(t.c, e.c, 0.001, `${type} day ${i + 1} carbohydrate for ${who}`);
      near(t.f, e.f, 0.001, `${type} day ${i + 1} fat for ${who}`);
      near(t.fb, e.fb, 0.001, `${type} day ${i + 1} fibre for ${who}`);
    }
  });
}
for (const type of ['nv', 'v'] as const)
  for (const who of WHO) {
    const t = dayTotal(FIXED[type], who), e = (g.fixed as any)[type][who];
    near(t.k, e.k, 0.001, `fixed ${type} plate kcal for ${who}`);
    near(t.p, e.p, 0.001, `fixed ${type} plate protein for ${who}`);
  }

/* Handover section 9.3 states the fixed plate's totals on screen. */
near(dayTotal(FIXED.nv, 'M').k, 1412, 12, 'handover s9.3: normal fixed plate about 1,412 kcal');
near(dayTotal(FIXED.nv, 'M').p, 139, 6, 'handover s9.3: normal fixed plate about 139 g protein');
near(dayTotal(FIXED.v, 'M').k, 1494, 12, 'handover s9.3: vegetarian fixed plate about 1,494 kcal');
near(dayTotal(FIXED.v, 'M').p, 135, 6, 'handover s9.3: vegetarian fixed plate about 135 g protein');

/* Reference mode must be the identity. If this drifts, the solver has started
   editing plates that nobody asked it to touch. */
for (const type of ['nv', 'v'] as const)
  for (const [i, ids] of CYCLE[type].entries())
    for (const who of WHO) {
      const ref = solveDay(ids.slice(0, 3), ids.slice(3), who, 'reference');
      const direct = dayTotal(ids, who);
      near(ref.total.k, direct.k, 0.001, `reference mode is the identity: ${type} day ${i + 1} ${who}`);
      near(ref.total.p, direct.p, 0.001, `reference mode keeps protein: ${type} day ${i + 1} ${who}`);
    }

/* Every dish, on its own, is a sane plate. */
for (const mid of Object.keys(g.M)) {
  for (const who of WHO) {
    const t = mealTotal(mid, who);
    ok(t.k > 40, `${mid} for ${who} is more than a garnish`);
    ok(t.k < 700, `${mid} for ${who} is not half a day in one sitting`);
  }
}

/* The five-meal cycle days sit inside the bands the plan was signed off against. */
for (const type of ['nv', 'v'] as const)
  for (const [i, ids] of CYCLE[type].entries())
    for (const who of WHO) {
      const t = dayTotal(ids, who), b = BANDS[who];
      ok(t.p >= b.pMin, `${type} day ${i + 1}: ${PEOPLE[who].name} clears the protein floor (${t.p.toFixed(0)} >= ${b.pMin})`);
      ok(t.f >= b.fMin, `${type} day ${i + 1}: ${PEOPLE[who].name} clears the fat floor (${t.f.toFixed(0)} >= ${b.fMin})`);
    }

report('macrotest');
