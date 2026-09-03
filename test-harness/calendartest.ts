/* calendartest — the plan is attached to the right calendar days.

   This exists because it was missed. The date strip walked the plan by adding
   86,400,000 ms per day. 25 October 2026 is the day UK clocks go back, so that
   day is 25 hours long: adding 24 hours to it landed on 25 October again. The
   strip showed 25 October twice, every day after it was one behind, and
   10 December — the last day of the plan — was unreachable. Six and a half
   weeks of a fifteen-week plan on the wrong dates and the wrong weekdays.

   The assertion that should have caught it compared toISOString() values.
   Those are UTC, so they stayed 102 unique strings while the local dates were
   101. **An assertion that cannot observe the bug is not a test.** Everything
   here is checked in local time, which is what a person reads off a phone.

   The suite runs under TZ=Europe/London (see run-all.sh) because that is where
   Mrinal and Ramesh are, and because a DST bug is invisible in UTC. */

import { DAYS, WEEKS, START, END, dayOf, indexOf, weekOf, weekStart,
         festivalOn, isFestivalVeg, FESTIVALS, fmtShort, fmtLong } from '../src/data/calendar.ts';
import { ok, eq, report } from './assert.ts';

const local = (d: Date): string => d.toLocaleDateString('en-GB');
const weekday = (d: Date): string => d.toLocaleDateString('en-GB', { weekday: 'long' });

eq(process.env.TZ, 'Europe/London', 'the suite runs in the users\' timezone, where the DST bug lives');

/* ---------- every day is its own calendar day ---------- */
eq(DAYS, 102, '31 August to 10 December 2026 inclusive is 102 days');
const dates = Array.from({ length: DAYS }, (_, i) => dayOf(i));
eq(new Set(dates.map(local)).size, DAYS, `all ${DAYS} days are distinct calendar dates — 25 October appeared twice`);

eq(local(dates[0]!), '31/08/2026', 'the plan opens on 31 August 2026');
eq(weekday(dates[0]!), 'Monday', 'which is a Monday');
eq(local(dates[DAYS - 1]!), '10/12/2026', 'and closes on 10 December 2026 — it used to stop at the 9th');
eq(weekday(dates[DAYS - 1]!), 'Thursday', 'which is a Thursday');

/* Each step is exactly one calendar day, including across the transition. */
for (let i = 1; i < DAYS; i++) {
  const a = dates[i - 1]!, b = dates[i]!;
  const step = Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
                         - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5);
  eq(step, 1, `day ${i - 1} to ${i} is one calendar day (${local(a)} -> ${local(b)})`);
  eq(a.getHours(), 0, `day ${i - 1} sits at local midnight, not 23:00 the day before`);
}

/* ---------- the transition itself, named ---------- */
const CLOCKS_BACK = new Date(2026, 9, 25);
const backIdx = indexOf(CLOCKS_BACK);
eq(backIdx, 55, '25 October 2026 — the day the clocks go back — is day index 55');
eq(local(dayOf(55)), '25/10/2026', 'index 55 is the 25th');
eq(local(dayOf(56)), '26/10/2026', 'and index 56 is the 26th, not the 25th again');
eq(weekday(dayOf(56)), 'Monday', 'and it is a Monday');
ok(dayOf(56).getTime() - dayOf(55).getTime() === 25 * 3600e3,
   'the 25-hour day is handled by calendar arithmetic, not by pretending it is 24');

/* Every Monday in the plan really is a Monday. Week boundaries ride on this. */
for (let w = 0; w < WEEKS; w++) {
  const first = dayOf(weekStart(w));
  eq(weekday(first), 'Monday', `week ${w + 1} starts on a Monday (${local(first)})`);
}

/* ---------- round trips ---------- */
for (let i = 0; i < DAYS; i++) {
  eq(indexOf(dayOf(i)), i, `indexOf(dayOf(${i})) round-trips`);
  eq(weekOf(i), Math.floor(i / 7), `day ${i} lands in the right week`);
}
eq(indexOf(new Date(2026, 7, 30)), null, 'the day before the plan has no index');
eq(indexOf(new Date(2026, 11, 11)), null, 'the day after the plan has no index');
/* A real Date carries a time of day. It must not change which day it is. */
eq(indexOf(new Date(2026, 10, 2, 23, 45)), indexOf(new Date(2026, 10, 2, 0, 15)),
   'late at night is still the same day');

/* ---------- festivals land on the right dates ---------- */
eq(local(dayOf(indexOf(new Date(2026, 8, 14))!)), '14/09/2026', 'Ganesh Chaturthi opens on the 14th');
ok(isFestivalVeg(new Date(2026, 8, 14, 23, 59)), 'and late on the 14th is still inside it');
ok(!isFestivalVeg(new Date(2026, 8, 13, 23, 59)), 'while late on the 13th is not');
ok(isFestivalVeg(new Date(2026, 9, 20, 0, 1)), 'Vijayadashami, the 20th, is inside Dasara');
ok(!isFestivalVeg(new Date(2026, 9, 21, 0, 1)), 'the 21st is not');
let vegDays = 0;
for (let i = 0; i < DAYS; i++) if (isFestivalVeg(dayOf(i))) vegDays++;
eq(vegDays, 22, '22 vegetarian days, counted over local dates');
for (const f of FESTIVALS) {
  ok(indexOf(f.from) !== null, `${f.name} opens inside the plan window`);
  ok(indexOf(f.to) !== null, `${f.name} closes inside the plan window`);
}

/* ---------- what the screen actually prints ---------- */
eq(fmtShort(dayOf(0)), '31 Aug', 'the strip label for day 1');
eq(fmtShort(dayOf(DAYS - 1)), '10 Dec', 'and for the last day');
eq(fmtLong(dayOf(56)), 'Monday 26 Oct', 'the day after the clocks change reads correctly');
for (let i = 0; i < DAYS; i++) {
  ok(!/Invalid/.test(fmtShort(dayOf(i))), `day ${i} formats to something real`);
  ok(!/Invalid/.test(fmtLong(dayOf(i))), `day ${i} formats long to something real`);
}

report('calendartest');
