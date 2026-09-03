/* packtest — the shopping list is what you would actually put in a trolley.

   Two earlier versions of the solver were wrong, and both failures are pinned
   here: a greedy largest-first fill gave three boxes for 26 eggs, and pure
   waste-minimisation gave four separate tubs of yoghurt to save 20 g. */

import g from './goldens.json' with { type: 'json' };
import { F, COUNTABLE } from '../src/data/foods.ts';
import { PEOPLE } from '../src/data/people.ts';
import { isFestivalVeg, dayOf, DAYS } from '../src/data/calendar.ts';
import { bestDay } from '../src/lib/daysolver.ts';
import { packUp, bestCombo, buildList, groupOf, addRows, packLife, money, SHORTFALL_TOLERANCE, MAX_PACKS } from '../src/lib/shopping.ts';
import { ok, eq, near, deep, report } from './assert.ts';

/* Against goldens: the legacy solver's answer for every packable food. */
for (const [fid, byNeed] of Object.entries(g.packs) as [string, Record<string, any>][])
  for (const [need, want] of Object.entries(byNeed)) {
    const got = packUp(fid, Number(need));
    eq(got.buy, want.buy, `goldens: packUp(${fid}, ${need}).buy`);
    eq(got.note, want.note, `goldens: packUp(${fid}, ${need}).note`);
    eq(got.count, want.count, `goldens: packUp(${fid}, ${need}).count`);
  }

/* The eggs case, named in handover section 14.3. */
const eggs = packUp('egg', 26 * 50);
eq(eggs.count, 26, '26 eggs are 26 eggs, not 1.29 kg');
ok(eggs.note.includes('eggs'), 'and the list says "eggs"');
const boxes = Object.values(bestCombo(26, F.egg!.unit!.box!).counts).reduce((a, b) => a + b, 0);
eq(boxes, 2, 'handover s12.2: 26 eggs is two boxes, not three');

/* The chicken case, from the QA pass: 2.65 kg needed, two packs make 2.6 kg. */
const chicken = packUp('chicken', 2650);
eq(chicken.buy, 2600, '2.65 kg of chicken is covered by 1 x 1 kg + 1 x 1.6 kg');
eq(chicken.short, 50, 'and the 50 g shortfall is stated on the line rather than left to be noticed');

/* The yoghurt case. */
const fage = packUp('greek', 2600);
const tubs = fage.note.split('+').length;
ok(tubs <= 3, `2.6 kg of Fage is at most three tubs, not four to save 20 g (got "${fage.note}")`);
ok(fage.buy >= 2600 * SHORTFALL_TOLERANCE, 'and it still covers the need');

/* All eleven countable items say what they are. */
eq(COUNTABLE.length, 11, 'eleven items are counted, not weighed');
for (const fid of COUNTABLE) {
  const p = packUp(fid, F[fid]!.unit!.g * 3.4);
  eq(p.count, 4, `${fid} rounds up to whole items`);
  ok(p.note.includes(F[fid]!.unit!.p) || p.note.includes(F[fid]!.unit!.s),
    `${fid} is described in its own words ("${p.note}")`);
  ok(!/\bkg\b/.test(p.note.split('—')[0]!), `${fid} is not offered by the kilogram`);
}

/* Never more than four packs, always enough, never absurdly over. */
for (const fid of Object.keys(F))
  for (const need of [30, 90, 220, 480, 1010, 2400]) {
    const p = packUp(fid, need);
    ok(p.buy >= need * SHORTFALL_TOLERANCE, `${fid} at ${need} g: buying ${p.buy} covers the need`);
    /* A shortfall is allowed — buying a third pack of chicken to cover 50 g is
       the worse error — but it is never silent. If the trolley holds less than
       the week needs, the line says so. */
    if (p.buy < need) {
      ok(p.short !== undefined, `${fid} at ${need} g: a ${need - p.buy} g shortfall is disclosed, not swallowed`);
      eq(p.short, Math.round(need - p.buy), `${fid} at ${need} g: the shortfall is stated exactly`);
      ok(need - p.buy <= need * (1 - SHORTFALL_TOLERANCE) + 1,
        `${fid} at ${need} g: the shortfall stays inside the 3% tolerance`);
    } else {
      eq(p.short, undefined, `${fid} at ${need} g: nothing to disclose when it covers`);
    }
    ok(p.buy <= Math.max(need * 3, need + 5000), `${fid} at ${need} g: ${p.buy} is not a pallet`);
    if (F[fid]!.packs) {
      const n = Object.values(bestCombo(need, F[fid]!.packs!).counts).reduce((a, b) => a + b, 0);
      const biggest = F[fid]!.packs![0]!;
      /* Four packs is the search limit. Past that the solver falls back to
         "as many of the biggest as it takes", which is simply true: 2.4 kg of
         cod IS five 500 g packs, and pretending otherwise would be the bug. */
      const floor = Math.ceil((need * SHORTFALL_TOLERANCE) / biggest);
      ok(n <= Math.max(MAX_PACKS, floor), `${fid} at ${need} g needs ${n} packs (floor ${floor})`);
    }
  }
/* The fallback path itself, stated rather than assumed. */
eq(Object.values(bestCombo(4800, [500, 250]).counts).reduce((a, b) => a + b, 0), 10,
  '4.8 kg from 500 g packs is ten packs, and the solver says so rather than inventing a bigger bag');

/* Shop grouping: soft greens go on the midweek trip, dals go to the grocer. */
eq(groupOf(F.spinach!), 'super-fresh', 'spinach is a midweek top-up — buy it Monday, bin it Friday');
/* Midweek is "perishable AND not freezable". Chicken was landing under
   "Salad and soft greens" while the main-shop panel said "Chicken, dairy,
   frozen fish, tins" — an external QA pass flagged it independently, which is
   two signals for what handover s12.1 said all along. Chicken breast freezes,
   so it carries frozenok now and joins the main shop. */
eq(groupOf(F.chicken!), 'super-main', 'handover s12.1: chicken is the main supermarket shop');
eq(groupOf(F.cod!), 'super-main', 'cod is frozen-friendly, so it rides with the main shop');
eq(groupOf(F.spinach!), 'super-fresh', 'and soft greens are still the midweek trip');
eq(groupOf(F.atta!), 'indian-main', 'atta is the Indian grocer, and the bag lasts months');
eq(groupOf(F.paneerlf!), 'indian-main', 'paneer is the Indian grocer');
eq(groupOf(F.lauki!), 'indian-fresh', 'lauki is a grocer top-up');

/* A real week's list, built from real solved days. */
const need: Record<string, number> = {};
const recent: Record<'b' | 'l' | 'd' | 'later', string[]> = { b: [], l: [], d: [], later: [] };
for (let i = 0; i < 7; i++) {
  const day = bestDay({ vegetarian: isFestivalVeg(dayOf(i)), laterCount: 0, recent })!;
  recent.b.push(day.core[0]!); recent.l.push(day.core[1]!); recent.d.push(day.core[2]!);
  for (const who of ['M', 'R'] as const) for (const m of day.solved[who].meals) addRows(need, m.rows);
}
const list = buildList(need);
ok(list.rows.length >= 15, `a normal week's list holds ${list.rows.length} lines`);
ok(list.rows.length <= 40, 'and is not a hundred lines long');

/* No total until every line is priced. A partial total built on a third of the
   data is more misleading than no total at all — handover section 13.3. */
eq(list.total, null, 'no weekly total is claimed while any price is unknown');
ok(list.unpriced > 0, `${list.unpriced} lines are still unpriced, and the app says so`);
const allPrices = Object.fromEntries(list.rows.map(r => [r.fid, 4]));
const priced = buildList(need, { prices: allPrices });
ok(priced.total !== null, 'once every line is priced, a total appears');
eq(priced.unpriced, 0, 'and nothing is left unknown');
ok(priced.total! > 0, `the total is a real number (${money(priced.total!)})`);

/* Exactly the seven researched prices are marked approximate; nothing else. */
const approx = list.rows.filter(r => r.approx).map(r => r.fid).sort();
for (const fid of approx) ok(F[fid]!.psrc, `'${fid}' is marked approximate and carries its source`);
ok(!list.rows.some(r => r.price !== undefined && !r.approx), 'no price appears without either a source or a user entering it');

/* Marking something owned takes it off the list without losing it. */
const withHave = buildList(need, { have: { greek: true } });
eq(withHave.rows.length, list.rows.length - 1, 'marking Fage as owned drops it from the list');
eq(withHave.owned.length, 1, 'and it is shown separately as already in');
eq(withHave.owned[0]!.fid, 'greek', 'as Fage');

/* Pack life: the argument for inventory over a weekly list. */
const rice = packLife('rice', need.rice ?? 300);
ok(rice === null || rice > 3, `a 5 kg bag of rice lasts ${rice?.toFixed(1)} weeks, not one`);
ok(packLife('nonsense', 100) === null, 'an unknown food has no pack life');

/* Grouping covers every row exactly once. */
const grouped = Object.values(list.groups).flat().length;
eq(grouped, list.rows.length, 'every line lands in exactly one shop group');

void PEOPLE; void DAYS; void deep; void near;
report('packtest');
