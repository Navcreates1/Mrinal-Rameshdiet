/* The Today tab. Naveen's verdict on this one was "fine", so it keeps its shape:
   the day's meals, three portions per ingredient line, and a live ring for each
   person. What changed is underneath — three meals rather than five, and the
   weights come from the portion solver rather than a stored table. */

import { F } from '../data/foods.ts';
import { M } from '../data/meals.ts';
import { PEOPLE, BANDS } from '../data/people.ts';
import type { PersonId } from '../data/people.ts';
import { dayOf, fmtLong, festivalOn, DAYS } from '../data/calendar.ts';
import { ROT, FIXED } from '../data/cycle.ts';
import { solveDay, LATER_SHARE } from '../lib/portion.ts';
import type { DaySolution, SolvedMeal } from '../lib/portion.ts';
import { cookedWeight } from '../lib/macros.ts';
import { LABEL } from '../data/pools.ts';
import { state, isVegDay, dayType, swapsFor } from './state.ts';
import { ico } from './icons.ts';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const amt = (fid: string, g: number): string => (F[fid]!.ml ? `${g} ml` : `${Math.round(g)} g`);

/** Which meals today. A built week wins; otherwise the day is solved fresh. */
export function todayPlan(day: number): { core: string[]; later: string[] } {
  const veg = isVegDay(day);
  if (state.mode === 'fixed') {
    const set = FIXED[veg ? 'v' : 'nv'];
    return { core: [set[0]!, set[2]!, set[4]!], later: [] };
  }
  const plan = state.plans[Math.floor(day / 7)];
  const fromPlan = plan?.days[day % 7];
  if (fromPlan) {
    const ok = [...fromPlan.core, ...fromPlan.later].every(id => M[id] && (!veg || M[id]!.v === 1));
    if (ok) return applyPicks(day, fromPlan);
  }
  const key = veg ? 'v' : 'nv';
  const n = day % 7;
  return applyPicks(day, {
    core: [ROT[key].b![n % ROT[key].b!.length]!,
           ROT[key].l![n % ROT[key].l!.length]!,
           ROT[key].d![n % ROT[key].d!.length]!],
    later: state.picks.wantLater ? [ROT[key].mm![n % ROT[key].mm!.length]!] : [],
  });
}

/** A dish chosen by hand for one slot on one day overrides the plan. */
function applyPicks(day: number, p: { core: string[]; later: string[] }): { core: string[]; later: string[] } {
  const slots = ['b', 'l', 'd'] as const;
  const core = p.core.map((id, i) => {
    const picked = state.slotPick[`${day}:${slots[i]}`];
    return picked && M[picked] && (!isVegDay(day) || M[picked]!.v === 1) ? picked : id;
  });
  return { core, later: p.later };
}

export const solveToday = (day: number, who: PersonId): DaySolution => {
  const { core, later } = todayPlan(day);
  return solveDay(core, later, who, state.mode === 'fixed' ? 'reference' : 'solved');
};

/* ------------------------------------------------------------------ rings */

function ring(who: PersonId, sol: DaySolution): string {
  const p = PEOPLE[who], t = sol.total, b = BANDS[who];
  const pct = Math.min(1, t.k / p.t.k);
  const bar = (label: string, got: number, want: number, colour: string): string => `
    <div class="mrow"><span>${label}</span>
      <span class="mtrack"><i style="width:${Math.min(100, (got / want) * 100).toFixed(0)}%;background:${colour}"></i></span>
      <b class="num">${got.toFixed(0)}<em>/${want}</em></b></div>`;
  return `<div class="miniring">
    <h4 style="color:${p.colour}">${p.name}</h4>
    <div class="kcal"><b class="num">${Math.round(t.k)}</b><span>of ${p.t.k} kcal</span>
      <span class="ktrack"><i style="width:${(pct * 100).toFixed(0)}%"></i></span></div>
    ${bar('Protein', t.p, p.t.p, 'var(--chilli)')}
    ${bar('Carbs', t.c, p.t.c, 'var(--turmeric)')}
    ${bar('Fat', t.f, p.t.f, 'var(--indigo)')}
    ${bar('Fibre', t.fb, p.t.fb, 'var(--leaf)')}
    ${t.f < b.fMin ? `<p class="src warn">Fat is ${t.f.toFixed(0)} g — under the ${b.fMin} g floor. That floor is hormonal, not cosmetic.</p>` : ''}
    ${t.p < b.pMin ? `<p class="src warn">Protein is ${t.p.toFixed(0)} g, under the ${b.pMin} g floor for this plan.</p>` : ''}
  </div>`;
}

/* ------------------------------------------------------------- meal cards */

function ingredientLine(meal: SolvedMeal, i: number, day: number, slot: string, rowsR: SolvedMeal): string {
  const [fid, gM, type] = meal.rows[i]!;
  const gR = rowsR.rows[i]![1];
  const o = F[fid]!;
  const cooked = cookedWeight(fid, gM);
  const swappable = type !== 'fix';
  /* Three figures on every line: each plate, and what goes in the pan. She
     weighs the pan total, cooks it as one dish, then weighs the two plates. */
  const show = state.who;
  const cell = (cls: string, label: string, g: number, dim: boolean): string =>
    `<span class="pcell ${cls}${dim ? ' dim' : ''}"><s>${label}</s><b>${amt(fid, g)}</b></span>`;
  return `<div class="ing">
    <div class="iname">${esc(o.n)}
      ${o.w ? `<span class="wbadge ${o.w === 'dry' ? 'dry' : ''}">weigh ${o.w}</span>` : ''}
      <em>${fid === 'atta'
        ? 'makes one roti — weigh the flour, not the roti'
        : cooked ? `${cooked.verb} about <b>${cooked.g} g</b> cooked — the ${Math.round(gM)} g is what you weigh` : esc(o.s)}</em></div>
    <div class="pgrid">
      ${cell('mm', 'Mrinal', gM, show === 'R')}
      ${cell('rr', 'Ramesh', gR, show === 'M')}
      ${cell('pan', 'In the pan', gM + gR, false)}
    </div>
    ${swappable && state.mode !== 'fixed'
      ? `<div class="swaprow"><button class="swapbtn" data-swap="${day}:${slot}:${meal.mid}:${i}" data-type="${type}"
          aria-label="Change the ${LABEL[type].toLowerCase()} in this meal">swap</button></div>` : ''}
  </div>`;
}

const SLOT_NAME: Record<string, string> = { b: 'Breakfast', l: 'Lunch', d: 'Dinner', x: 'Later' };

/* Method text carries {foodId} placeholders, never a typed number.

   The recipes used to say "One roti from 40 g atta" beside a row reading 55 g,
   and the sentence is what someone standing at a hob actually follows. Across
   three rotis a day that was roughly 300 kcal unaccounted for — two thirds of
   Mrinal's entire deficit. Two of the numbers disagreed with their own
   ingredient row in the original handover, before any scaling: dnv1's table
   said 50 g of atta and its method said 45 g; lnv3's said 7.5 ml of oil and its
   method said 5 ml.

   Now every quantity in the prose is the same value as the row above it,
   because it is read from the same solved plate. */
function methodStep(step: string, forM: SolvedMeal, forR: SolvedMeal): string {
  return esc(step).replace(/\{(\w+)\}/g, (whole, fid: string) => {
    const i = forM.rows.findIndex(r => r[0] === fid);
    if (i < 0) return whole;
    const gM = forM.rows[i]![1], gR = forR.rows[i]![1];
    const one = (g: number) => `<b>${amt(fid, g)}</b>`;
    if (state.who === 'M') return one(gM);
    if (state.who === 'R') return one(gR);
    /* Same order as the cells above the method: her plate, then his. */
    return gM === gR ? one(gM) : `${one(gM)} / ${one(gR)}`;
  });
}

function mealCard(mM: SolvedMeal, mR: SolvedMeal, slot: string, day: number, n: number): string {
  const meal = M[mM.mid]!;
  const t = mM.macros;
  return `<section class="meal">
    <header><span class="mi">${ico(meal.ic)}</span>
      <span class="mt"><b>${SLOT_NAME[slot] ?? 'Meal'}</b>${esc(meal.t)}</span>
      <span class="mkcal"><b class="num">${Math.round(t.k)}</b>kcal<i>${t.p.toFixed(0)} g protein</i></span>
      ${state.mode !== 'fixed' && slot !== 'x'
        ? `<button class="pickbtn" data-pickslot="${day}:${slot}">change</button>` : ''}
    </header>
    <div class="ings">${mM.rows.map((_, i) => ingredientLine(mM, i, day, slot, mR)).join('')}</div>
    <ol class="method">${meal.m.map(step => `<li>${methodStep(step, mM, mR)}</li>`).join('')}</ol>
    ${n === 0 ? `<p class="src">Weigh the pan total, cook it as one dish, then weigh the two plates before anyone sits down.</p>` : ''}
  </section>`;
}

export function viewToday(): string {
  const day = state.day;
  const veg = isVegDay(day);
  const why = festivalOn(dayOf(day));
  const solM = solveToday(day, 'M'), solR = solveToday(day, 'R');
  const slots = ['b', 'l', 'd', 'x'];
  const cards = solM.meals.map((m, i) => mealCard(m, solR.meals[i]!, slots[i] ?? 'x', day, i)).join('');
  const show = state.who;

  return `<div class="modes">
      <button class="${state.mode === 'choose' ? 'on' : ''}" data-mode="choose">Choose &amp; swap</button>
      <button class="${state.mode === 'fixed' ? 'on' : ''}" data-mode="fixed">Same every day</button>
    </div>
    ${veg ? `<div class="banner">${ico('greens')}<div><b>${why ? esc(why) + ' — a vegetarian day' : 'A vegetarian day'}.</b>
      No meat, no fish, no eggs. Dairy is fine.${!why ? ' Set by hand on the Shop tab.' : ''}</div></div>` : ''}
    ${dayType(day) === 'out' ? `<div class="banner">${ico('rice')}<div><b>Marked as eating out.</b>
      This day is off the plan and off the shopping list. The meals below are what it would have been.</div></div>` : ''}
    <div class="rings">${show === 'both' || show === 'M' ? ring('M', solM) : ''}${show === 'both' || show === 'R' ? ring('R', solR) : ''}</div>
    ${solM.meals.length === 3 && !state.picks.wantLater
      ? `<p class="src center">Three meals, carrying the whole day between them.
          <button class="linkbtn" data-golater="1">Want something later?</button>
          It comes out of the day's budget — about ${Math.round(PEOPLE.M.t.k * LATER_SHARE)} kcal —
          not on top of it.</p>` : ''}
    ${cards}
    <div class="copybar">
      <button data-copyday="${show}">Copy ${show === 'both' ? 'both days' : PEOPLE[show as PersonId].name + "'s day"} for Cronometer</button>
    </div>`;
}

export const dayLabel = (i: number): string => fmtLong(dayOf(i));
export const lastDay = (): number => DAYS - 1;
