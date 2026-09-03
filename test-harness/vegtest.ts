/* vegtest — no meat, fish or eggs on a fasting day. All 102 of them.

   This is the harness for the worst defect the project has had. A mixed week
   was planned entirely as vegetarian or entirely as normal, by majority vote.
   Weeks 6 and 8 would have served meat on three fasting days, breaking
   religious observance. Week 4 forced vegetarian food onto two normal days.

   Vegetarian status is a property of the DAY, read from the calendar, never of
   the week. That is what this file exists to keep true. */

import { F } from '../src/data/foods.ts';
import { M } from '../src/data/meals.ts';
import { ROT } from '../src/data/cycle.ts';
import { DAYS, WEEKS, dayOf, isFestivalVeg, festivalOn, weekOf } from '../src/data/calendar.ts';
import { buildWeek } from '../src/lib/daysolver.ts';
import type { WeekDayRequest } from '../src/lib/daysolver.ts';
import { ok, eq, report } from './assert.ts';

const FORBIDDEN = Object.keys(F).filter(id => F[id]!.v === 0);
eq(FORBIDDEN.length, 6, 'six foods are off the table on a fasting day: chicken, cod, salmon, prawns, egg, egg white');

/* Every week's day-by-day shape, against handover section 4. */
const shape: string[] = [];
for (let w = 0; w < WEEKS; w++) {
  let s = '';
  for (let i = 0; i < 7; i++) {
    const d = w * 7 + i;
    if (d >= DAYS) break;
    s += isFestivalVeg(dayOf(d)) ? 'V' : '.';
  }
  shape.push(s);
}
eq(shape[0], '.......', 'week 1 (31 Aug) is entirely normal');
eq(shape[2], 'VVVVVVV', 'week 3 (14 Sept) is entirely vegetarian');
eq(shape[3], 'VVVVV..', 'week 4 (21 Sept) is MIXED — 5 vegetarian, 2 normal');
eq(shape[5], '......V', 'week 6 (5 Oct) is MIXED — 1 vegetarian, 6 normal');
eq(shape[6], 'VVVVVVV', 'week 7 (12 Oct) is entirely vegetarian');
eq(shape[7], 'VV.....', 'week 8 (19 Oct) is MIXED — 2 vegetarian, 5 normal');
eq(shape[14], '....', 'week 15 (7 Dec) is four days to 10 December');
eq(shape.filter(s => s.includes('V') && s.includes('.')).length, 3, 'handover s4: three mixed weeks');
eq(shape.filter(s => /^V+$/.test(s)).length, 2, 'handover s4: two entirely vegetarian weeks');
eq(shape.filter(s => /^\.+$/.test(s)).length, 10, 'handover s4: ten entirely normal weeks');

/* Festival names are attached, so the screen can say WHY a day is vegetarian
   rather than just asserting it. */
eq(festivalOn(dayOf(14)), 'Ganesh Chaturthi', 'day 15 is Ganesh Chaturthi');
eq(festivalOn(dayOf(41)), 'Dasara', 'day 42 is Dasara');
eq(festivalOn(dayOf(0)), null, 'day 1 is an ordinary Monday');

/* The real check: build every week and inspect every plate. */
let vegDaysChecked = 0, mealsChecked = 0;
for (let w = 0; w < WEEKS; w++) {
  const days: WeekDayRequest[] = [];
  for (let i = 0; i < 7; i++) {
    const idx = w * 7 + i;
    if (idx >= DAYS) break;
    days.push({ index: idx, eatingOut: false, vegetarian: isFestivalVeg(dayOf(idx)), laterCount: i % 2 });
  }
  const week = buildWeek(days);
  eq(week.failedOn, null, `week ${w + 1} builds every day`);
  week.days.forEach((day, i) => {
    ok(day, `week ${w + 1} day ${i + 1} has a plan`);
    if (!day) return;
    const req = days[i]!;
    eq(weekOf(req.index), w, `day ${req.index} belongs to week ${w + 1}`);
    if (!req.vegetarian) return;
    vegDaysChecked++;
    for (const mid of [...day.core, ...day.later]) {
      mealsChecked++;
      eq(M[mid]!.v, 1, `week ${w + 1} day ${i + 1} is a fasting day: '${M[mid]!.t}' must be vegetarian`);
      for (const [fid] of M[mid]!.x)
        ok(!FORBIDDEN.includes(fid), `week ${w + 1} day ${i + 1}: '${M[mid]!.t}' must not contain ${F[fid]!.n}`);
    }
  });
}
eq(vegDaysChecked, 22, 'all 22 fasting days were built and inspected');
ok(mealsChecked >= 66, `${mealsChecked} plates checked on fasting days`);

/* And the mirror case: a normal day is never forced onto vegetarian food by a
   neighbouring festival. Week 4 forced vegetarian food onto two normal days. */
const w4: WeekDayRequest[] = [];
for (let i = 0; i < 7; i++) {
  const idx = 21 + i;
  w4.push({ index: idx, eatingOut: false, vegetarian: isFestivalVeg(dayOf(idx)), laterCount: 0 });
}
const built = buildWeek(w4);
eq(built.failedOn, null, 'week 4, the hardest mixed week, builds');
built.days.forEach((day, i) => {
  if (!day || w4[i]!.vegetarian) return;
  const anyNonVeg = [...day.core].some(mid => M[mid]!.v === 0);
  ok(anyNonVeg, `week 4 day ${i + 1} is a normal day and is not silently planned as vegetarian`);
});

/* The pools themselves cannot leak. */
for (const slot of ['b', 'mm', 'l', 's', 'd'] as const)
  for (const mid of ROT.v[slot]!)
    eq(M[mid]!.v, 1, `the vegetarian ${slot} pool offers only vegetarian dishes ('${mid}')`);

report('vegtest');
