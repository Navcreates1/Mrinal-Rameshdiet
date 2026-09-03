/* datalock — the data model has not drifted.
   Runs FIRST, and deliberately so. Every gram figure in the app is computed
   from src/data, so a single wrong composition value moves every screen, every
   shopping quantity and both people's targets at once.

   Two independent checks, and both matter:

   1. Against test-harness/goldens.json, extracted from the legacy app before
      any refactoring. This proves the rebuild changed no number.
   2. Against the handover document's own tables, typed out here by hand. This
      proves the LEGACY file was right in the first place — a check goldens
      alone can never make, because goldens agree with whatever they came from.

   A failure here is a finding, not an obstacle. Do not regenerate goldens.json
   to make it pass; that needs a written reason in DECISIONS.md. */

import g from './goldens.json' with { type: 'json' };
import { F, VERIFY, COUNTABLE, PRICED, WEIGHED } from '../src/data/foods.ts';
import { M, MEAL_IDS, isPulse } from '../src/data/meals.ts';
import { PEOPLE, SCALE, shortfall, lossPerWeek, bmi, mifflin } from '../src/data/people.ts';
import { DAYS, WEEKS, dayOf, isFestivalVeg, indexOf, START, END } from '../src/data/calendar.ts';
import { mealRows, mealTotal } from '../src/lib/macros.ts';
import { ok, eq, near, deep, report } from './assert.ts';

/* ---------- 1. counts, straight from handover sections 6, 7 and 4 ---------- */
eq(Object.keys(F).length, 63, 'handover s6: the food database holds 63 ingredients');
eq(MEAL_IDS.length, 30, 'handover s7: the meal library holds 30 meals');
eq(VERIFY.length, 13, 'handover s6.1: thirteen foods carry the VERIFY flag');
eq(WEIGHED.length, 16, 'handover s6.2: sixteen foods must be weighed raw or dry');
eq(COUNTABLE.length, 11, 'handover s12.2: eleven items are sold by the unit');
eq(PRICED.length, 7, 'handover s13.2: seven real prices were found. Never more, never invented');
eq(DAYS, 102, 'handover: 31 Aug to 10 Dec 2026 inclusive is 102 days');
eq(WEEKS, 15, 'handover s4: fifteen shopping weeks');

let vegDays = 0;
for (let i = 0; i < DAYS; i++) if (isFestivalVeg(dayOf(i))) vegDays++;
eq(vegDays, 22, 'handover s4: 22 vegetarian days across the plan');

/* ---------- 2. the handover's own tables, typed by hand ---------- */
/* Section 6, per 100 g. If the legacy file had a typo, this is what catches it. */
const S6: Record<string, [number, number, number, number, number]> = {
  chicken: [106, 22.5, 0, 2.6, 0], cod: [82, 17.8, 0, 0.7, 0],
  salmon: [131, 25.4, 0, 4.3, 0], prawns: [71, 13.6, 0.9, 1, 0],
  egg: [143, 12.5, 0.7, 9.5, 0], white: [52, 11, 0.7, 0.2, 0],
  paneerlf: [180, 21, 4, 9, 0], paneer: [296, 20, 3.5, 23, 0],
  greek: [54, 10.3, 3, 0, 0], sains: [59, 11.5, 4, 0.1, 0],
  curd: [61, 3.4, 4, 3, 0], whey: [370, 90, 2, 0.5, 0],
  tofu: [72, 8, 2, 4.8, 0.3], soya: [345, 52, 33, 0.5, 13],
  moong: [347, 24, 59, 1.2, 16], toor: [331, 22.3, 63, 1.5, 15],
  masoor: [346, 24.2, 59, 1.3, 11], chanadal: [360, 20, 60, 5, 17],
  rajma: [340, 22.9, 60, 1.5, 15.2], chana: [378, 19.5, 63, 6, 12],
  huelb: [444, 44.4, 24.4, 19.4, 9.3], huelp: [400, 30, 46, 13, 7],
  rice: [358, 7.5, 77, 0.9, 1.4], atta: [339, 13.7, 72.6, 1.87, 12.2],
  oats: [379, 13.15, 67.7, 6.52, 10.1], quinoa: [368, 14.1, 64.2, 6.07, 7],
  poha: [340, 6.5, 78, 1, 2.5], spinach: [23, 2.9, 3.6, 0.4, 2.2],
  methi: [49, 4.4, 6, 0.9, 4.8], amaranth: [33, 3.9, 4, 0.5, 2.2],
  sarson: [27, 2.9, 4.7, 0.4, 3.2], cauli: [30, 1.9, 5, 0.3, 2],
  cabbage: [25, 1.3, 5.8, 0.1, 2.5], okra: [33, 2, 7, 0.2, 3.2],
  brinjal: [25, 1, 6, 0.2, 3], lauki: [14, 0.6, 2.5, 0.1, 1.2],
  turai: [17, 0.9, 4, 0.1, 2], ashgourd: [13, 0.4, 3, 0.2, 2.9],
  snakegourd: [18, 0.5, 3.3, 0.3, 0.8], karela: [21, 1, 3.7, 0.2, 2.8],
  tinda: [21, 1.4, 3.4, 0.2, 1.5], parwal: [20, 2, 2, 0.3, 3],
  tindora: [18, 1.2, 3.1, 0.1, 1.6], gawar: [16, 3.3, 10.8, 0.4, 3.2],
  beans: [31, 1.8, 7, 0.1, 3.4], drumstick: [35, 2.2, 3.7, 0.15, 3.2],
  carrot: [41, 0.9, 10, 0.2, 2.8], capsicum: [31, 1, 6, 0.3, 2.1],
  broccoli: [34, 2.8, 7, 0.4, 2.6], cucumber: [15, 0.7, 3.6, 0.1, 0.5],
  tomato: [18, 0.9, 3.9, 0.2, 1.2], onion: [40, 1.1, 9.3, 0.1, 1.7],
  mooli: [16, 0.7, 3.4, 0.1, 1.6], pumpkin: [26, 1, 6.5, 0.1, 0.5],
  peas: [81, 5.4, 14, 0.4, 5], berries: [57, 0.7, 14.5, 0.3, 2.4],
  almond: [579, 21.2, 21.6, 49.9, 12.5], apple: [52, 0.3, 13.8, 0.2, 2.4],
  banana: [89, 1.1, 22.8, 0.3, 2.6], orange: [47, 0.9, 11.8, 0.1, 2.4],
  papaya: [43, 0.5, 10.8, 0.3, 1.7], oil: [813, 0, 0, 92, 0], ghee: [828, 0, 0, 92, 0],
};
eq(Object.keys(S6).length, 63, 'the hand-typed section 6 table itself holds 63 rows');
for (const [fid, [k, p, c, f, fb]] of Object.entries(S6)) {
  const o = F[fid];
  ok(o, `handover s6 lists '${fid}' and the database has it`);
  if (!o) continue;
  eq(o.k, k, `s6 ${fid} kcal`); eq(o.p, p, `s6 ${fid} protein`);
  eq(o.c, c, `s6 ${fid} carbohydrate`); eq(o.f, f, `s6 ${fid} fat`);
  eq(o.fb, fb, `s6 ${fid} fibre`);
}

/* Section 6.1 — exactly these thirteen, no more and no fewer. */
deep([...VERIFY].sort(), ['amaranth', 'ashgourd', 'chanadal', 'drumstick', 'huelb', 'karela',
  'masoor', 'parwal', 'poha', 'snakegourd', 'tinda', 'tindora', 'turai'],
  'handover s6.1: the VERIFY set is exactly the thirteen named');

/* Section 3 — the targets, and the arithmetic the Plan tab explains. */
eq(PEOPLE.M.t.k, 1420, 'handover s3: Mrinal 1,420 kcal — raised from 1,340 to clear the NHS floor');
eq(PEOPLE.M.t.p, 120, 'handover s3: Mrinal 120 g protein');
eq(PEOPLE.R.t.k, 1800, 'handover s3: Ramesh 1,800 kcal');
eq(PEOPLE.R.t.p, 140, 'handover s3: Ramesh 140 g protein');
eq(shortfall('M'), 450, 'handover s3: Mrinal daily shortfall 450 kcal');
eq(shortfall('R'), 380, 'handover s3: Ramesh daily shortfall 380 kcal');
near(lossPerWeek('M'), 0.41, 0.005, 'handover s3: Mrinal 0.41 kg a week');
near(lossPerWeek('R'), 0.35, 0.005, 'handover s3: Ramesh 0.35 kg a week');
near(bmi(65, 155), 27.1, 0.05, 'handover s2: Mrinal BMI 27.1 now');
near(bmi(59, 155), 24.6, 0.05, 'handover s2: Mrinal BMI 24.6 at goal');
near(bmi(75, 169), 26.3, 0.05, 'handover s2: Ramesh BMI 26.3 now');
near(bmi(70, 169), 24.5, 0.05, 'handover s2: Ramesh BMI 24.5 at goal');
near(mifflin(PEOPLE.M), 1263, 1, 'handover s3: Mifflin-St Jeor gives Mrinal 1,263 kcal');
near(mifflin(PEOPLE.R), 1586, 1, 'handover s3: Mifflin-St Jeor gives Ramesh 1,586 kcal');

/* Section 8 — the per-macro multipliers, derived from the targets rather than typed. */
near(SCALE.pro!, 1.167, 0.001, 'handover s8: protein x1.167 (140/120)');
near(SCALE.carb!, 1.346, 0.001, 'handover s8: carbohydrate x1.346 (175/130)');
near(SCALE.fat!, 1.429, 0.001, 'handover s8: fat x1.429 (60/42)');
eq(SCALE.veg, 1.25, 'handover s8: vegetables x1.25 — volume, not macro matching');

/* Section 8's worked example: the lemon and pepper chicken lunch. */
const lnv1M = mealRows('lnv1', 'M'), lnv1R = mealRows('lnv1', 'R');
const gramOf = (rows: typeof lnv1M, fid: string) => rows.find(r => r[0] === fid)?.[1];
eq(gramOf(lnv1M, 'chicken'), 145, 's8 worked example: Mrinal 145 g chicken');
eq(gramOf(lnv1R, 'chicken'), 170, 's8 worked example: Ramesh 170 g chicken');
eq(gramOf(lnv1M, 'oil'), 7.5, 's8 worked example: Mrinal 7.5 ml oil');
eq(gramOf(lnv1R, 'oil'), 10, 's8 worked example: Ramesh 10 ml oil');
eq(gramOf(lnv1M, 'rice'), 45, 's8 worked example: Mrinal 45 g rice');
eq(gramOf(lnv1R, 'rice'), 60, 's8 worked example: Ramesh 60 g rice');
eq(gramOf(lnv1M, 'broccoli'), 200, 's8 worked example: Mrinal 200 g broccoli');
eq(gramOf(lnv1R, 'broccoli'), 250, 's8 worked example: Ramesh 250 g broccoli');

/* Calendar boundaries and the two festival windows. */
eq(indexOf(START), 0, 'the plan opens on 31 August 2026');
eq(indexOf(END), 101, 'the plan closes on 10 December 2026, day index 101');
eq(indexOf(new Date(2026, 7, 30)), null, 'a date before the window has no index');
eq(indexOf(new Date(2026, 11, 11)), null, 'a date after the window has no index');
ok(isFestivalVeg(new Date(2026, 8, 14)), 'Ganesh Chaturthi opens 14 September');
ok(isFestivalVeg(new Date(2026, 8, 25)), 'Ganesh Chaturthi closes 25 September');
ok(!isFestivalVeg(new Date(2026, 8, 26)), '26 September is a normal day');
ok(isFestivalVeg(new Date(2026, 9, 11)), 'Dasara opens 11 October');
ok(isFestivalVeg(new Date(2026, 9, 20)), 'Vijayadashami, 20 October, is the last fasting day');
ok(!isFestivalVeg(new Date(2026, 9, 21)), '21 October is a normal day');

/* ---------- 3. against goldens: the rebuild changed no number ---------- */
eq(Object.keys(F).length, Object.keys(g.F).length, 'goldens: food count unchanged');
for (const [fid, want] of Object.entries(g.F) as [string, Record<string, unknown>][]) {
  const got = F[fid] as unknown as Record<string, unknown>;
  ok(got, `goldens: food '${fid}' still exists`);
  if (!got) continue;
  for (const key of Object.keys(want)) deep(got[key], want[key], `goldens: F.${fid}.${key}`);
}
for (const [mid, want] of Object.entries(g.M) as [string, any][]) {
  const got = M[mid];
  ok(got, `goldens: meal '${mid}' still exists`);
  if (!got) continue;
  eq(got.t, want.t, `goldens: M.${mid} title`);
  eq(got.v, want.v, `goldens: M.${mid} vegetarian flag`);
  deep(got.x, want.x, `goldens: M.${mid} ingredients`);
  deep(got.m, want.m, `goldens: M.${mid} method`);
}
/* Every plate, both people: the grams served and the macros they add up to. */
for (const [mid, want] of Object.entries(g.meals) as [string, any][]) {
  for (const who of ['M', 'R'] as const) {
    deep(mealRows(mid, who), want.plates[who].rows, `goldens: ${mid} rows for ${who}`);
    const t = mealTotal(mid, who), e = want.plates[who].total;
    near(t.k, e.k, 0.001, `goldens: ${mid} kcal for ${who}`);
    near(t.p, e.p, 0.001, `goldens: ${mid} protein for ${who}`);
    near(t.c, e.c, 0.001, `goldens: ${mid} carbohydrate for ${who}`);
    near(t.f, e.f, 0.001, `goldens: ${mid} fat for ${who}`);
    near(t.fb, e.fb, 0.001, `goldens: ${mid} fibre for ${who}`);
  }
}
/* The calendar, day by day — in LOCAL dates.
   These were re-baselined on 2026-09-03. The original app walked the plan by
   adding 86,400,000 ms a day, which lands on 25 October twice because the
   clocks go back, so every date after it was one behind and 10 December was
   unreachable. The goldens had faithfully recorded that. See DECISIONS.md.

   The comparison was toISOString(), which is UTC and stayed 102 unique strings
   while the local dates were 101 — it could not see the bug it was there to
   catch. It is local now. The 22 fasting-day indices are unchanged by the fix,
   and calendartest.ts checks the transition directly. */
for (const row of g.calendar as { i: number; local: string; veg: number }[]) {
  const d = dayOf(row.i);
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  eq(local, row.local, `goldens: day ${row.i} local date`);
  eq(isFestivalVeg(d) ? 1 : 0, row.veg, `goldens: day ${row.i} vegetarian status`);
}

/* ---------- 4. internal consistency ---------- */
for (const [mid, m] of Object.entries(M)) {
  for (const [fid, grams, type] of m.x) {
    ok(F[fid], `${mid} references a food that exists: '${fid}'`);
    ok(grams > 0, `${mid} ${fid} has a positive weight`);
    ok(['pro', 'carb', 'veg', 'fruit', 'fat', 'fix'].includes(type), `${mid} ${fid} has a real slot tag`);
  }
  ok(m.x.some(([, , t]) => t === 'pro'), `${mid} has a protein line`);
  ok(m.m.length > 0, `${mid} has a method`);
  /* A vegetarian meal may contain no meat, fish or eggs. This is the check that
     the worst defect in the project's history would have failed. */
  if (m.v === 1) for (const [fid] of m.x)
    eq(F[fid]!.v, 1, `${mid} is marked vegetarian, so '${fid}' must be too`);
}
/* Never two pulse mains in one day — rajma at lunch and chana dal at dinner
   overloads carbohydrate. Naming them means adding a ninth is a deliberate act. */
deep(MEAL_IDS.filter(isPulse).sort(), ['bv3', 'dv1', 'dv3', 'dv4', 'dv5', 'lv3', 'lv4', 'lv5'],
  'exactly eight dishes are built on a pulse');

/* ---------- 5. no quantity is typed into a recipe ---------- */
/* The method text is what someone standing at a hob actually follows. It used
   to carry hand-typed weights that disagreed with the rows above them — "One
   roti from 40 g atta" beside a row reading 55 g. Across three rotis a day that
   is roughly 300 kcal unaccounted for, two thirds of Mrinal's deficit. Two of
   them were wrong in the handover itself, before any scaling.

   Quantities are {foodId} placeholders now, resolved from the same solved plate
   as the rows. These assertions stop a number being typed back in. */
const LITERALS_ALLOWED = [
  /\d+\s*ml (?:cold )?water/i,   // water is not weighed and is not scaled
  /\d+\s*ml water/i,
  /scoop is roughly \d+\s*g/i,   // a fact about the tub, not a portion
  /scoop on most tubs is about \d+\s*g/i,
];
for (const [mid, meal] of Object.entries(M)) {
  const weights = new Set(meal.x.map(([, grams]) => grams));
  for (const step of meal.m) {
    /* Every placeholder must name an ingredient this meal actually has. */
    for (const m of step.matchAll(/\{(\w+)\}/g)) {
      const fid = m[1]!;
      ok(meal.x.some(([f]) => f === fid),
        `${mid}: method references {${fid}}, which is not an ingredient of this dish`);
    }
    /* And no bare number may equal one of this meal's weights — that is a
       quantity typed by hand instead of read from the data. */
    for (const m of step.matchAll(/(\d+(?:\.\d+)?)\s*(?:g|ml)\b/gi)) {
      const value = Number(m[1]);
      const context = step.slice(Math.max(0, m.index! - 30), m.index! + 30);
      if (LITERALS_ALLOWED.some(re => re.test(context))) continue;
      ok(!weights.has(value),
        `${mid}: "${m[0]}" is typed into the method and matches an ingredient weight — use a {placeholder}\n         ...${context}...`);
    }
  }
}

report('datalock');
