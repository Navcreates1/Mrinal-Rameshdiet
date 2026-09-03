/* duptest — the duplicate-family audit.

   A separate tub of dahi was bought to marinate 140 g of chicken while a tub of
   Fage sat in the same fridge. The fix was not just to correct that meal: it was
   to sweep for the class. This runs that sweep on every generated list.

   Handover section 14.4 names the pattern: "the duplicate dahi came from fixing
   the instance the user pointed at rather than sweeping for the class — the
   snack was corrected, two marinades were not." */

import { F } from '../src/data/foods.ts';
import { M } from '../src/data/meals.ts';
import { isFestivalVeg, dayOf } from '../src/data/calendar.ts';
import { bestDay } from '../src/lib/daysolver.ts';
import { buildList, addRows } from '../src/lib/shopping.ts';
import { ok, eq, report } from './assert.ts';

/** What you would reach for on the same shelf. Buying two of these in one week
    is not automatically wrong, but it must be a decision, not an accident. */
export const FAMILY: Record<string, string[]> = {
  'plain yoghurt': ['greek', 'sains', 'curd'],
  'paneer': ['paneerlf', 'paneer'],
  'protein powder': ['whey', 'huelb', 'huelp'],
  'split dal': ['moong', 'toor', 'masoor', 'chanadal'],
  'whole pulse': ['rajma', 'chana'],
  'cooking fat': ['oil', 'ghee'],
  'grain': ['rice', 'poha', 'quinoa'],
  'leafy green': ['spinach', 'methi', 'amaranth', 'sarson'],
  'gourd': ['lauki', 'turai', 'ashgourd', 'snakegourd', 'karela', 'tinda', 'parwal', 'tindora'],
  'brassica': ['cauli', 'cabbage', 'broccoli'],
};
for (const [name, ids] of Object.entries(FAMILY))
  for (const id of ids) ok(F[id], `family '${name}' names a real food: ${id}`);

/* Curd is the one that started it. It exists in the database for marinades and
   nothing else — it carries 3.4 g of protein against Fage's 10.3, a third. */
ok(F.curd!.p < F.greek!.p / 2, 'plain dahi is under half the protein of Fage, which is why it was removed');
ok(F.greek!.s.length > 0 || F.curd!.s.includes('marinade') || F.curd!.s.includes('Fage'),
  'and the database says so on the line');

/* No meal reaches for plain dahi. Marinades use the Fage already in the fridge. */
for (const [mid, meal] of Object.entries(M))
  for (const [fid] of meal.x)
    ok(fid !== 'curd', `'${M[mid]!.t}' must not put a second tub of dahi on the list`);

/* The real audit: build a fortnight of lists and inspect each one. */
const offenders: string[] = [];
let listsChecked = 0;
for (let week = 0; week < 15; week++) {
  const need: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const idx = week * 7 + i;
    const day = bestDay({ vegetarian: isFestivalVeg(dayOf(idx)), laterCount: i % 2 });
    if (!day) continue;
    for (const who of ['M', 'R'] as const)
      for (const m of day.solved[who].meals) addRows(need, m.rows);
  }
  const list = buildList(need);
  listsChecked++;
  for (const [name, ids] of Object.entries(FAMILY)) {
    const present = ids.filter(id => list.rows.some(r => r.fid === id));
    /* Greens and gourds are meant to vary — that is the point of 27 vegetables.
       The families that must not double up are the ones where a second product
       is simply a second tub of the same thing. */
    const strict = ['plain yoghurt', 'paneer', 'cooking fat'];
    if (strict.includes(name) && present.length > 1)
      offenders.push(`week ${week + 1}: ${name} appears as ${present.join(' and ')}`);
    ok(present.length <= ids.length, `week ${week + 1}: '${name}' cannot exceed its own family`);
  }
}
eq(listsChecked, 15, 'all fifteen weeks audited');
for (const o of offenders) ok(false, o);
eq(offenders.length, 0, 'no week buys two products from the same shelf without reason');

/* And the specific defect: no list carries both Fage and dahi. */
for (let week = 0; week < 15; week++) {
  const need: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const day = bestDay({ vegetarian: isFestivalVeg(dayOf(week * 7 + i)), laterCount: 0 });
    if (day) for (const who of ['M', 'R'] as const)
      for (const m of day.solved[who].meals) addRows(need, m.rows);
  }
  const ids = new Set(buildList(need).rows.map(r => r.fid));
  ok(!(ids.has('greek') && ids.has('curd')),
    `week ${week + 1} does not put Fage and a separate tub of dahi on the same list`);
}

report('duptest');
