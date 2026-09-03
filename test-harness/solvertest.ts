/* solvertest — three meals hit the target, and the optional item comes out of
   the day rather than sitting on top of it.

   Naveen, 3 September 2026: "3 meals is ideal and optional you can eat this
   later section would be good and eating 6 times is ideally not great."
   Handover section 2 already recorded her meal pattern as three meals; the app
   was built with five slots anyway.

   The rule this file exists to enforce: the day's budget is FIXED. Adding a
   later item takes its share out of the three meals. A day with a snack and a
   day without must total the same. */

import { F } from '../src/data/foods.ts';
import { M } from '../src/data/meals.ts';
import { PEOPLE, BANDS } from '../src/data/people.ts';
import type { PersonId } from '../src/data/people.ts';
import { DAYS, dayOf, isFestivalVeg } from '../src/data/calendar.ts';
import { solveDay, solveMeal, CEILING, BAND, OIL_FLOOR_ML } from '../src/lib/portion.ts';
import { bestDay, buildWeek, missingSlots } from '../src/lib/daysolver.ts';
import type { WeekDayRequest } from '../src/lib/daysolver.ts';
import { gramsFor } from '../src/lib/scale.ts';
import { ok, eq, near, report } from './assert.ts';

const WHO = ['M', 'R'] as const;
const KCAL_TOL = 60;   // how far a solved day may sit from target

/* ---------- 1. every calendar day, solved, in band ---------- */
let checked = 0;
for (const laterCount of [0, 1] as const) {
  const recent: Record<'b' | 'l' | 'd' | 'later', string[]> = { b: [], l: [], d: [], later: [] };
  for (let i = 0; i < DAYS; i++) {
    const vegetarian = isFestivalVeg(dayOf(i));
    const r = bestDay({ vegetarian, laterCount, recent });
    ok(r, `day ${i} (${vegetarian ? 'vegetarian' : 'normal'}, ${laterCount} later) can be built`);
    if (!r) continue;
    checked++;
    recent.b.push(r.core[0]!); recent.l.push(r.core[1]!); recent.d.push(r.core[2]!);
    recent.later.push(...r.later);
    if (recent.b.length > 7) { recent.b.shift(); recent.l.shift(); recent.d.shift(); }

    eq(r.core.length, 3, `day ${i}: three core meals, never five`);
    eq(r.later.length, laterCount, `day ${i}: ${laterCount} optional item(s)`);

    /* The rule that cost this project its worst defect. */
    if (vegetarian) for (const mid of [...r.core, ...r.later])
      eq(M[mid]!.v, 1, `day ${i} is a fasting day, so '${mid}' must be vegetarian`);

    for (const who of WHO) {
      const t = r.solved[who].total, b = BANDS[who], name = PEOPLE[who].name;
      near(t.k, PEOPLE[who].t.k, KCAL_TOL, `day ${i} ${name} calories`);
      ok(t.p >= b.pMin, `day ${i} ${name} protein floor: ${t.p.toFixed(0)} >= ${b.pMin}`);
      ok(t.p <= b.pMax, `day ${i} ${name} protein ceiling: ${t.p.toFixed(0)} <= ${b.pMax}`);
      ok(t.f >= b.fMin, `day ${i} ${name} fat floor: ${t.f.toFixed(0)} >= ${b.fMin}`);
      ok(t.f <= b.fMax, `day ${i} ${name} fat ceiling: ${t.f.toFixed(0)} <= ${b.fMax}`);
      ok(t.p >= PEOPLE[who].t.p, `day ${i} ${name} clears the protein target itself`);
    }
  }
}
ok(checked === DAYS * 2, `all ${DAYS} days solved in both shapes (got ${checked})`);

/* ---------- 2. the later item comes OUT of the budget ---------- */
for (const vegetarian of [false, true]) {
  const a = bestDay({ vegetarian, laterCount: 0 })!;
  const b = bestDay({ vegetarian, laterCount: 1 })!;
  for (const who of WHO) {
    near(a.solved[who].total.k, PEOPLE[who].t.k, KCAL_TOL,
      `${vegetarian ? 'veg' : 'normal'} 3-meal day hits ${PEOPLE[who].name}'s target`);
    near(b.solved[who].total.k, PEOPLE[who].t.k, KCAL_TOL,
      `${vegetarian ? 'veg' : 'normal'} 3-meal + later day hits the SAME target`);
    near(b.solved[who].total.k, a.solved[who].total.k, KCAL_TOL * 2,
      `${vegetarian ? 'veg' : 'normal'}: eating later does not add calories for ${PEOPLE[who].name}`);
  }
}

/* ---------- 3. no plate is silly ---------- */
const SANE: Record<string, number> = {
  chicken: 300, cod: 300, salmon: 260, prawns: 340, paneerlf: 240, paneer: 200,
  tofu: 460, whey: 45, almond: 20, oil: 15, ghee: 15, rice: 110, atta: 110,
  oats: 90, quinoa: 120, egg: 220, soya: 90, moong: 100, masoor: 100,
  chanadal: 100, rajma: 100, chana: 100,
};
for (const mid of Object.keys(M)) {
  for (const who of WHO) {
    for (const share of [0.28, 0.33, 0.40]) {
      const s = solveMeal(mid, who, {
        k: PEOPLE[who].t.k * share, p: 139 * share, fMax: BANDS[who].fMax * share,
      });
      for (const [fid, grams, type] of s.rows) {
        const cap = SANE[fid];
        const limit = cap === undefined ? 600 : who === 'M' ? cap : cap * 1.5;
        ok(grams <= limit, `${mid} ${fid}: ${grams} is a plate, not a challenge (<= ${limit} for ${who})`);
        ok(grams > 0, `${mid} ${fid} has a positive weight`);
        const stepSize = F[fid]!.ml ? 2.5 : 5;
        eq(grams % stepSize, 0, `${mid} ${fid} lands on a ${stepSize} ${F[fid]!.ml ? 'ml' : 'g'} step`);
        if (type === 'fat' && F[fid]!.ml) ok(grams >= OIL_FLOOR_ML, `${mid} keeps a real tadka (${grams} ml)`);
        const ceil = CEILING[fid];
        if (ceil !== undefined && who === 'M') ok(grams <= ceil, `${mid} ${fid} respects its ceiling of ${ceil}`);
      }
    }
  }
}

/* ---------- 4. bands are honoured, and reference mode is untouched ---------- */
for (const mid of Object.keys(M)) {
  const meal = M[mid]!;
  for (const who of WHO) {
    const ref = solveMeal(mid, who);
    for (const [i, [fid, refG, type]] of meal.x.entries()) {
      eq(ref.rows[i]![1], gramsFor(who, fid, refG, type), `${mid} ${fid}: reference mode is untouched for ${who}`);
    }
    const stretched = solveMeal(mid, who, { k: 900, p: 90 });
    for (const [i, [fid, refG, type]] of meal.x.entries()) {
      const base = gramsFor(who, fid, refG, type);
      ok(stretched.rows[i]![1] <= base * BAND[type][1] + 5, `${mid} ${fid} cannot exceed its band even when pushed`);
    }
    const squeezed = solveMeal(mid, who, { k: 120, p: 8 });
    for (const [i, [fid, refG, type]] of meal.x.entries()) {
      const base = gramsFor(who, fid, refG, type);
      ok(squeezed.rows[i]![1] >= Math.min(base, base * BAND[type][0] - 5) || squeezed.rows[i]![1] >= 2.5,
        `${mid} ${fid} cannot vanish even when squeezed`);
    }
  }
}

/* ---------- 5. a week builds, day by day, against each day's own status ---------- */
for (const w of [0, 2, 3, 5, 7, 14]) {
  const days: WeekDayRequest[] = [];
  for (let i = 0; i < 7 && w * 7 + i < DAYS; i++) {
    const idx = w * 7 + i;
    days.push({ index: idx, eatingOut: false, vegetarian: isFestivalVeg(dayOf(idx)), laterCount: 0 });
  }
  const week = buildWeek(days);
  eq(week.failedOn, null, `week ${w + 1} builds without failing on a day`);
  eq(week.days.length, days.length, `week ${w + 1} plans every day`);
  week.days.forEach((d, i) => {
    ok(d, `week ${w + 1} day ${i + 1} has a plan`);
    if (!d) return;
    if (days[i]!.vegetarian) for (const mid of d.core)
      eq(M[mid]!.v, 1, `week ${w + 1} day ${i + 1} is a fasting day and '${mid}' must be vegetarian`);
  });
  /* Mixed weeks are the difficult case and the source of the worst defect.
     Week 4 (index 3) is 5 vegetarian and 2 normal; week 8 (index 7) is 2 and 5. */
  const vegN = days.filter(d => d.vegetarian).length;
  if (w === 3) eq(vegN, 5, 'week 4 is a mixed week: five vegetarian days');
  if (w === 5) eq(vegN, 1, 'week 6 is a mixed week: one vegetarian day');
  if (w === 7) eq(vegN, 2, 'week 8 is a mixed week: two vegetarian days');
  if (w === 2) eq(vegN, 7, 'week 3 is entirely vegetarian');
  if (w === 0) eq(vegN, 0, 'week 1 is entirely normal');
}

/* ---------- 6. an empty slot blocks the build instead of being ignored ---------- */
/* The legacy poolFor returned the FULL list when the user had switched
   everything off, so turning a slot off did nothing while the screen said it
   had. Naveen never saw this because he gave up before building a week. */
eq(bestDay({ vegetarian: false, allow: { l: [] } }), null,
  'no lunches switched on means no day, not a day built from all of them');
near(missingSlots({ vegetarian: false, allow: { l: [] } }).length, 1, 0, 'the empty slot is named');
eq(missingSlots({ vegetarian: false, allow: { l: [] } })[0], 'Lunch', 'and it is named as Lunch');
eq(missingSlots({ vegetarian: false, allow: { b: [], d: [] } }).length, 2, 'two empty slots, both named');
ok(bestDay({ vegetarian: false, allow: { l: ['lnv1'] } }), 'one lunch switched on is enough to build');
eq(bestDay({ vegetarian: false, allow: { l: ['lnv1'] } })!.core[1], 'lnv1',
  'and the day uses the lunch that was actually chosen');

/* A vegetarian day may not be built from the non-vegetarian pool. */
const vegDay = bestDay({ vegetarian: true });
ok(vegDay, 'a vegetarian day builds');
for (const mid of vegDay!.core) eq(M[mid]!.v, 1, `vegetarian day serves only vegetarian dishes ('${mid}')`);

report('solvertest');
