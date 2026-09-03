/* The Shop tab: six steps from "which days" to a list you can shop from.

   This is the part that failed. Naveen's report, 3 September 2026:

     "the shop section is not really great because I've asked the app to ask me
      whether it's a vegetarian, non-vegetarian or what, but it never asked me.
      It just decided that it's a normal day... it gave me four lunch options,
      but everything is non-veg. And everything is selected automatically where
      it should be unselected, and then the user should select... vegetables
      also, everything is selected. I would rather select what I want than
      unselect everything, which is kind of chaotic. And I haven't really tried
      build a week because I got fed up."

   Four changes, each answering one sentence of that:

   1. Step 1 sets each day's type. The Ganesh and Dasara windows pre-set it and
      say why; every other day is one tap. Before, the calendar decided alone
      and week 1 has no festival days, so there was nothing to ask.
   2. The vegetarian dishes appear as soon as any day is marked vegetarian.
   3. Nothing is pre-selected. "Pick a good set for me" fills a sensible
      starting set in one tap, so opting in is never a chore.
   4. An empty slot BLOCKS the build and names itself. The legacy poolFor
      quietly used the full list when nothing was switched on, so turning a
      slot off did nothing at all while the screen said otherwise. */

import { F } from '../data/foods.ts';
import { M } from '../data/meals.ts';
import { ROT } from '../data/cycle.ts';
import { POOL } from '../data/pools.ts';
import { PEOPLE } from '../data/people.ts';
import type { PersonId } from '../data/people.ts';
import { DAYS, WEEKS, dayOf, fmtLong, fmtShort, weekStart } from '../data/calendar.ts';
import { buildWeek, missingSlots } from '../lib/daysolver.ts';
import type { WeekDayRequest } from '../lib/daysolver.ts';
import { solveDay, CORE_SHARE } from '../lib/portion.ts';
import { buildList, addRows, GROUP_LABEL, GROUP_NOTE, money, packLife, amountOf } from '../lib/shopping.ts';
import type { Group, ShoppingList } from '../lib/shopping.ts';
import { state, dayType, reasonFor, isOverriddenFestival, persist } from './state.ts';
import type { DayType, WeekPlan } from './state.ts';
import { ico } from './icons.ts';

const STEPS = ['Days', 'Meals', 'Veg', 'Week', 'Cupboard', 'Shop'];
export const MIN_PER_SLOT = 2;

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* A ✓ used to appear on every step behind the current one whether or not it had
   been done — "Meals" showed a tick from the start, then refused to build
   because nothing was chosen. A tick now means completed, and the steps are
   buttons: the only way back was the Back button, one screen at a time. */
function stepDone(w: number, i: number): boolean {
  switch (i) {
    case 0: return cooking(w).length > 0;
    case 1: return (['b', 'l', 'd'] as const).every(k => state.picks[k].length > 0);
    case 2: return state.picks.veg.length > 0;
    case 3: return Boolean(state.plans[w]);
    case 4: return Boolean(state.plans[w]);
    default: return false;
  }
}

const stepBar = (w: number, n: number): string =>
  `<nav class="steps" aria-label="Shopping steps">${STEPS.map((label, i) => {
    const done = stepDone(w, i) && i !== n;
    const reachable = i <= n || (i <= 2 && stepDone(w, i - 1)) || (i >= 3 && Boolean(state.plans[w]));
    return `<button class="stp ${done ? 'done' : i === n ? 'now' : ''}" ${reachable ? `data-step="${i}"` : 'disabled'}
      aria-current="${i === n}"><b>${done ? '✓' : i + 1}</b><span>${label}</span></button>`;
  }).join('')}</nav>`;

const weekDayIndexes = (w: number): number[] => {
  const out: number[] = [];
  for (let i = 0; i < 7 && weekStart(w) + i < DAYS; i++) out.push(weekStart(w) + i);
  return out;
};

const cooking = (w: number): number[] => weekDayIndexes(w).filter(i => dayType(i) !== 'out');
const hasVeg = (w: number): boolean => cooking(w).some(i => dayType(i) === 'vegetarian');
const hasNormal = (w: number): boolean => cooking(w).some(i => dayType(i) === 'normal');

/** Dishes offered for a slot this week, given which day types are in play.
    Vegetarian dishes appear the moment ANY day is marked vegetarian — which is
    exactly what did not happen before. */
export function offered(w: number, slot: 'b' | 'l' | 'd' | 'later'): string[] {
  const take = (key: 'nv' | 'v'): string[] =>
    slot === 'later' ? [...ROT[key].mm!, ...ROT[key].s!] : ROT[key][slot]!;
  const ids: string[] = [];
  if (hasNormal(w)) ids.push(...take('nv'));
  if (hasVeg(w)) ids.push(...take('v'));
  if (!ids.length) ids.push(...take('nv'));
  return [...new Set(ids)];
}

/* --------------------------------------------------------- "pick for me" */

/** A balanced starting set: enough variety to build a week, small enough to
    read. Chosen by protein density so the week is not carried by one dish. */
export function suggestFor(w: number, slot: 'b' | 'l' | 'd' | 'later'): string[] {
  const ids = offered(w, slot);
  const veg = ids.filter(id => M[id]!.v === 1);
  const non = ids.filter(id => M[id]!.v === 0);
  const out: string[] = [];
  if (slot === 'later') {
    out.push(...(hasVeg(w) && !hasNormal(w) ? veg : ids).slice(0, 2));
  } else {
    /* Three per day type, not two. With two the day solver has eight
       combinations to choose between and the week alternates visibly between
       the best pair — the plan is right and it reads as repetitive. */
    const each = 3;
    if (hasNormal(w) && non.length) out.push(...non.slice(0, Math.min(each, non.length)));
    if (hasVeg(w) && veg.length) out.push(...veg.slice(0, Math.min(each, veg.length)));
  }
  if (!out.length) out.push(...ids.slice(0, 3));
  /* A vegetarian day still needs at least one vegetarian option in every slot. */
  if (hasVeg(w) && !out.some(id => M[id]!.v === 1) && veg.length) out.push(veg[0]!);
  return [...new Set(out)];
}

/** The vegetables the chosen dishes actually use, plus the aromatics every
    curry needs. Selecting these is what "Pick for me" does on step 3. */
export function vegNeededBy(picks: string[]): string[] {
  const used = new Set<string>();
  for (const mid of picks)
    for (const [fid, , type] of M[mid]!.x)
      if (type === 'veg' || (type === 'fix' && POOL.veg.includes(fid as never))) used.add(fid);
  for (const base of ['onion', 'tomato']) if (F[base]) used.add(base);
  return [...used];
}

/* --------------------------------------------------------------- building */

export function requestsFor(w: number): WeekDayRequest[] {
  return weekDayIndexes(w).map(i => ({
    index: i,
    eatingOut: dayType(i) === 'out',
    vegetarian: dayType(i) === 'vegetarian',
    laterCount: state.picks.wantLater ? 1 : 0,
    allow: {
      b: state.picks.b, l: state.picks.l, d: state.picks.d,
      ...(state.picks.wantLater ? { later: state.picks.later } : {}),
    },
  }));
}

/** What is stopping this week from being built, in the user's words. */
export function blockers(w: number): string[] {
  const out: string[] = [];
  const days = cooking(w);
  if (!days.length) return ['Every day this week is marked as eating out.'];
  const names: Record<string, string> = { b: 'Breakfast', l: 'Lunch', d: 'Dinner', later: 'Later' };
  for (const slot of ['b', 'l', 'd'] as const) {
    const chosen = state.picks[slot];
    if (!chosen.length) out.push(`${names[slot]} — nothing chosen yet.`);
    else if (hasVeg(w) && !chosen.some(id => M[id]!.v === 1))
      out.push(`${names[slot]} — this week has a vegetarian day and no vegetarian ${names[slot]!.toLowerCase()} is switched on.`);
  }
  if (state.picks.wantLater && !state.picks.later.length)
    out.push('Later — something later is switched on but nothing is chosen.');
  return out;
}

export function build(w: number): { ok: true } | { ok: false; why: string } {
  const stop = blockers(w);
  if (stop.length) return { ok: false, why: stop.join(' ') };
  const res = buildWeek(requestsFor(w));
  if (res.failedOn !== null) {
    const missing = res.missing.length ? ` ${res.missing.join(' and ')} has nothing switched on.` : '';
    return {
      ok: false,
      why: `${fmtLong(dayOf(res.failedOn))} could not be balanced from what is switched on.${missing} ` +
           `Switch a few more dishes on and try again — I would rather say so than serve a day that does not work.`,
    };
  }
  state.plans[w] = {
    days: res.days.map(d => (d ? { core: d.core, later: d.later } : null)),
    builtAt: new Date().toISOString(),
  };
  persist();
  return { ok: true };
}

/* ------------------------------------------------------------------ views */

function viewDays(w: number): string {
  const idx = weekDayIndexes(w);
  const vegN = idx.filter(i => dayType(i) === 'vegetarian').length;
  const outN = idx.filter(i => dayType(i) === 'out').length;
  const seg = (i: number, t: DayType, label: string): string =>
    `<button class="dtype${dayType(i) === t ? ' on' : ''}" data-daytype="${i}:${t}"
      aria-pressed="${dayType(i) === t}">${label}</button>`;

  return `<div class="sec"><h2>Which days, and what kind?</h2>
    <p>Set each day. The Ganesh Chaturthi and Dasara windows are already marked
       vegetarian and say so — but any day can be vegetarian, for any reason.
       Mark a day as eating out and it drops off the plan and off the list.</p></div>
  ${stepBar(w, 0)}
  <div class="panel">${idx.map(i => {
    const why = reasonFor(i);
    return `<div class="dayrow${dayType(i) === 'out' ? ' off' : ''}">
      <span class="dn">${esc(fmtLong(dayOf(i)))}
        ${why ? `<span class="pill v">${esc(why)}</span>` : ''}
        ${isOverriddenFestival(i) ? '<span class="pill warn">changed from the calendar</span>' : ''}</span>
      <span class="dseg">${seg(i, 'normal', 'Normal')}${seg(i, 'vegetarian', 'Vegetarian')}${seg(i, 'out', 'Eating out')}</span>
    </div>`;
  }).join('')}
    <p class="src">${vegN
      ? `${vegN} vegetarian ${vegN === 1 ? 'day' : 'days'} and ${idx.length - vegN - outN} normal. Each day is planned against its own status — a mixed week is never rounded to one or the other.`
      : 'No vegetarian days this week. Tap any day above to make one.'}${outN ? ` ${outN} dropped.` : ''}</p>
  </div>
  <div class="copybar"><button data-step="1">Next — choose meals</button></div>`;
}

function mealCardRow(id: string, slot: string): string {
  const on = (state.picks[slot as 'b'] as string[]).includes(id);
  const m = M[id]!;
  /* The base recipe, NOT the plated portion. The same dish shows a bigger
     number on Today because the solver scales it to that day's slot budget —
     showing 367 here and 447 there with neither labelled was confusing. */
  const t = solveDay([id], [], 'M', 'reference').total;
  const main = m.x.filter(x => x[2] === 'pro' || x[2] === 'carb').map(x => F[x[0]]!.n).join(', ');
  return `<button class="opt${on ? ' on' : ''}" data-pickmeal="${slot}" data-mid="${id}" aria-pressed="${on}">
    <span class="oi">${ico(m.ic)}</span>
    <span class="on2">${esc(m.t)}<em>${esc(main)}</em></span>
    <span class="om"><b class="num">${Math.round(t.k)}</b>kcal<br><span style="color:var(--chilli)">${t.p.toFixed(0)} g P</span>
      <br><i class="basenote">base recipe</i></span></button>`;
}

function viewMeals(w: number): string {
  const mixed = hasVeg(w) && hasNormal(w);
  const block = (slot: 'b' | 'l' | 'd', label: string): string => {
    const ids = offered(w, slot);
    const chosen = state.picks[slot].filter(id => ids.includes(id));
    const nv = ids.filter(id => M[id]!.v === 0);
    const veg = ids.filter(id => M[id]!.v === 1);
    const short = chosen.length < Math.min(MIN_PER_SLOT, ids.length);
    return `<div class="panel"><h3>${label}
        <span class="pill ${chosen.length ? 'n' : 'w'}">${chosen.length} chosen</span></h3>
      <p class="pickhint">${short
        ? `Pick at least ${Math.min(MIN_PER_SLOT, ids.length)} so the week has some variety.`
        : 'Add more if they want more variety.'}
        <button class="linkbtn" data-suggest="${slot}">Pick a good set for me</button></p>
      ${mixed && nv.length ? '<p class="src"><b>For the normal days</b></p>' : ''}
      ${nv.map(id => mealCardRow(id, slot)).join('')}
      ${mixed && veg.length ? '<p class="src" style="margin-top:10px"><b>For the vegetarian days</b></p>' : ''}
      ${veg.map(id => mealCardRow(id, slot)).join('')}
    </div>`;
  };

  const laterIds = offered(w, 'later');
  return `<div class="sec"><h2>What do they fancy?</h2>
    <p><b>Nothing is chosen yet — pick what they want.</b> The old version switched
       everything on and asked you to switch things off, which is the wrong way round.
       Every dish is weighed to the plan, so any of these work.</p></div>
  ${stepBar(w, 1)}
  <div class="banner">${ico('rice')}<div><b>Three meals a day.</b>
    Breakfast, lunch and dinner carry the whole day between them —
    ${Math.round(PEOPLE.M.t.k * CORE_SHARE.b)}–${Math.round(PEOPLE.M.t.k * CORE_SHARE.l)} kcal
    a meal for Mrinal and ${Math.round(PEOPLE.R.t.k * CORE_SHARE.b)}–${Math.round(PEOPLE.R.t.k * CORE_SHARE.l)}
    for Ramesh, lunch being the largest. More protein per sitting than five small
    ones managed.</div></div>
  ${block('b', 'Breakfast')}${block('l', 'Lunch')}${block('d', 'Dinner')}
  <div class="panel"><h3>Something later
      <span class="pill ${state.picks.wantLater ? 'n' : ''}">${state.picks.wantLater ? 'on' : 'off'}</span></h3>
    <p style="margin-bottom:10px">Optional, and off by default. If they want a
      mid-morning or afternoon item, it comes <b>out of</b> the day's budget, not
      on top — the three meals shrink to make room and the day still totals
      ${PEOPLE.M.t.k.toLocaleString('en-GB')} kcal.</p>
    <button class="cbtn${state.picks.wantLater ? ' yes' : ''}" data-wantlater="1">
      ${state.picks.wantLater ? 'Yes — include something later' : 'No — three meals is right'}</button>
    ${state.picks.wantLater ? `<div style="margin-top:12px">
      <p class="pickhint">Pick one or two.
        <button class="linkbtn" data-suggest="later">Pick for me</button></p>
      ${laterIds.map(id => mealCardRow(id, 'later')).join('')}</div>` : ''}
  </div>
  <div class="copybar"><button class="alt" data-step="0">Back</button><button data-step="2">Next — vegetables</button></div>`;
}

const VEG_GROUPS: [string, string[]][] = [
  ['Leafy', ['spinach', 'methi', 'amaranth', 'sarson', 'cabbage']],
  ['Gourds', ['lauki', 'turai', 'ashgourd', 'snakegourd', 'karela', 'tinda', 'parwal', 'tindora']],
  ['Everyday', ['onion', 'tomato', 'cucumber', 'carrot', 'capsicum', 'mooli', 'pumpkin']],
  ['Beans and pods', ['beans', 'gawar', 'drumstick', 'okra', 'peas']],
  ['Brassicas', ['cauli', 'broccoli', 'brinjal']],
];

function viewVeg(w: number): string {
  const on = state.picks.veg.length;
  const needed = vegNeededBy([...state.picks.b, ...state.picks.l, ...state.picks.d]);
  const missing = needed.filter(id => !state.picks.veg.includes(id));
  return `<div class="sec"><h2>Which vegetables?</h2>
    <p><b>None chosen yet.</b> These are most of the shopping list and most of the
       volume on the plate. Pick what they will actually eat — anything left off
       is substituted, not silently served.</p></div>
  ${stepBar(w, 2)}
  <div class="panel"><p class="pickhint">${on} of 27 chosen.
    <button class="linkbtn" data-suggestveg="1">Pick the ones these meals need</button></p></div>
  ${VEG_GROUPS.map(([g, ids]) => `<div class="panel"><h3>${g}</h3>
    <div class="vgrid">${ids.filter(id => F[id]).map(id => {
      const sel = state.picks.veg.includes(id);
      return `<button class="vchip${sel ? ' on' : ''}${needed.includes(id) && !sel ? ' want' : ''}"
        data-pickveg="${id}" aria-pressed="${sel}">${esc(F[id]!.n.split(' / ')[0]!)}
        <i>${F[id]!.k} kcal</i></button>`;
    }).join('')}</div></div>`).join('')}
  ${missing.length ? `<div class="banner warn">${ico('greens')}<div>
    <b>${missing.length} vegetable${missing.length > 1 ? 's' : ''} the chosen meals use ${missing.length > 1 ? 'are' : 'is'} not switched on.</b>
    ${esc(missing.map(id => F[id]!.n.split(' / ')[0]!).join(', '))} — they will be substituted with something of similar weight.</div></div>` : ''}
  ${on > 0 && on < 6 ? `<div class="banner warn">${ico('greens')}<div><b>Only ${on} vegetables chosen.</b>
    They are the cheapest volume on this plan — at ${PEOPLE.M.t.k.toLocaleString('en-GB')} kcal,
    cutting them is what makes a diet feel like starving.</div></div>` : ''}
  <div class="copybar"><button class="alt" data-step="1">Back</button>
    <button data-buildweek="${w}">Build the week</button></div>`;
}

function viewWeekReview(w: number): string {
  const plan = state.plans[w];
  if (!plan) return viewDays(w);
  const idx = weekDayIndexes(w);
  const rows: string[] = [];
  const kcals: Record<PersonId, number[]> = { M: [], R: [] };
  let leak = 0, overridden = 0;

  plan.days.forEach((d, i) => {
    const day = idx[i]!;
    if (!d) { rows.push(`<div class="wrow off"><span class="dn">${esc(fmtShort(dayOf(day)))}</span><em>Eating out</em></div>`); return; }
    const veg = dayType(day) === 'vegetarian';
    if (veg) for (const mid of [...d.core, ...d.later]) if (M[mid]!.v !== 1) leak++;
    if (isOverriddenFestival(day)) overridden++;
    const sol = { M: solveDay(d.core, d.later, 'M'), R: solveDay(d.core, d.later, 'R') };
    kcals.M.push(sol.M.total.k); kcals.R.push(sol.R.total.k);
    rows.push(`<div class="wrow${veg ? ' veg' : ''}">
      <span class="dn">${esc(fmtShort(dayOf(day)))}${veg ? '<span class="pill v">veg</span>' : ''}</span>
      <span class="wmeals">${[...d.core, ...d.later].map(mid => esc(M[mid]!.t)).join(' · ')}</span>
      <span class="wk"><b style="color:var(--chilli)">${Math.round(sol.M.total.k)}</b>
        <b style="color:var(--indigo)">${Math.round(sol.R.total.k)}</b></span></div>`);
  });

  const spread = (who: PersonId): number => {
    const a = kcals[who];
    return a.length ? Math.round(Math.max(...a) - Math.min(...a)) : 0;
  };

  return `<div class="sec"><h2>Week ${w + 1} of ${WEEKS}</h2>
    <p>${esc(fmtLong(dayOf(idx[0]!)))} to ${esc(fmtShort(dayOf(idx[idx.length - 1]!)))}.
      Two figures on each day: Mrinal in red, Ramesh in blue.</p></div>
  ${stepBar(w, 3)}
  <div class="panel">${rows.join('')}
    <p class="src">Spread across the week: ${spread('M')} kcal for Mrinal, ${spread('R')} for Ramesh.
      Under about 60 is noise; more than that and the week is uneven.</p></div>
  ${leak
    ? `<div class="banner bad">${ico('chicken')}<div><b>${leak} non-vegetarian item on a fasting day.</b>
        This should be impossible. Do not shop from this list — rebuild the week and tell Naveen.</div></div>`
    : `<div class="banner ok">${ico('greens')}<div><b>Checked: no meat, fish or eggs on any fasting day.</b>
        Every day was planned against its own status, not the week's majority.</div></div>`}
  ${overridden ? `<div class="banner warn">${ico('greens')}<div><b>${overridden} festival day
    ${overridden > 1 ? 'has' : 'has'} been changed away from vegetarian.</b> That was a deliberate
    choice on step 1 — noting it here so it is not a surprise at the table.</div></div>` : ''}
  <div class="copybar"><button class="alt" data-step="2">Back</button>
    <button data-step="4">Next — what is already in</button></div>`;
}

export function needsFor(w: number): Record<string, number> {
  const plan = state.plans[w];
  const need: Record<string, number> = {};
  if (!plan) return need;
  for (const d of plan.days) {
    if (!d) continue;
    for (const who of ['M', 'R'] as const)
      for (const meal of solveDay(d.core, d.later, who).meals) addRows(need, meal.rows);
  }
  /* Vegetables switched off are substituted by weight, not silently served. */
  const allow = state.picks.veg;
  if (allow.length) {
    for (const fid of Object.keys(need)) {
      if (!POOL.veg.includes(fid as never) || allow.includes(fid)) continue;
      const swap = allow.find(id => POOL.veg.includes(id as never)) ?? allow[0]!;
      need[swap] = (need[swap] ?? 0) + need[fid]!;
      delete need[fid];
    }
  }
  return need;
}

function viewCupboard(w: number): string {
  const list = buildList(needsFor(w), { have: state.have, prices: state.prices });
  const all = [...list.rows, ...list.owned].sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
  const owned = all.filter(r => state.have[r.fid]).length;
  return `<div class="sec"><h2>What is already in?</h2>
    <p>${all.length} things this week needs${owned ? `, and ${owned} ${owned === 1 ? 'is' : 'are'} already in` : ''}.
       Tap anything you have and it drops off the list.</p></div>
  ${stepBar(w, 4)}
  <div class="panel">${all.map(r => {
    const have = state.have[r.fid] === true;
    /* The button used to read "Buy it" as a label of current state, under an
       instruction that read as a command. It says what tapping does now. */
    return `<div class="gitem${have ? ' done' : ''}">
      <span class="gn">${esc(r.name)}<em>${r.pack.count ? r.pack.note : `${amountOf(r.fid, Math.round(r.need))}${r.pack.note ? ' — ' + r.pack.note : ''}`}</em></span>
      <button class="cbtn${have ? '' : ' yes'}" data-have="${r.fid}"
        aria-pressed="${have}">${have ? '✓ Already in' : 'I have this'}</button></div>`;
  }).join('')}
    <p class="src">${all.length - owned} to buy. Anything left untapped goes on the list.</p></div>
  <div class="copybar"><button class="alt" data-step="3">Back</button>
    <button data-step="5">Next — the list</button></div>`;
}

function listGroup(key: Group, list: ShoppingList, weekNeed: Record<string, number>): string {
  const arr = list.groups[key];
  if (!arr.length) return '';
  return `<div class="panel"><h3>${GROUP_LABEL[key]}</h3>
    <p style="margin-bottom:10px">${GROUP_NOTE[key]}</p>
    ${arr.map(r => {
      const life = packLife(r.fid, weekNeed[r.fid] ?? 0);
      const tickId = key + r.fid;
      return `<label class="gitem${state.ticked[tickId] ? ' done' : ''}">
        <input type="checkbox" data-tick="${tickId}" ${state.ticked[tickId] ? 'checked' : ''}>
        <span class="gn">${esc(r.name)}${F[r.fid]!.frozenok ? ' <span class="pill n">frozen is fine</span>' : ''}
          <em>${r.pack.count ? 'buy ' + esc(r.pack.note) : `need ${amountOf(r.fid, Math.round(r.need))}${r.pack.note ? ' — buy ' + esc(r.pack.note) : ''}`}${F[r.fid]!.w ? ' · ' + F[r.fid]!.w + ' weight' : ''}${life && life > 2 ? ` · lasts about ${life.toFixed(0)} weeks` : ''}${r.pack.short ? ` · <b class="under">${r.pack.short} g under</b> — the next pack up is more waste than it is worth` : ''}</em></span>
        <button type="button" class="gc${r.price === undefined ? ' guess' : r.approx ? ' approx' : ''}"
          data-price="${r.fid}"
          aria-label="${r.price === undefined ? 'Add the price of' : 'Change the price of'} ${esc(r.name)}"
          >${r.price === undefined ? 'add<i>price</i>'
            : money((r.price * r.pack.buy) / 1000) + (r.approx ? `<i>${money(r.price)}/${F[r.fid]!.ml ? 'l' : 'kg'} · looked up</i>` : '<i>your price</i>')}</button>
      </label>`;
    }).join('')}</div>`;
}

function viewList(w: number): string {
  const need = needsFor(w);
  const list = buildList(need, { have: state.have, prices: state.prices });
  const idx = weekDayIndexes(w);
  const order: Group[] = ['super-main', 'super-fresh', 'indian-main', 'indian-fresh'];
  return `<div class="sec"><h2>The list</h2>
    <p>Week ${w + 1}, ${esc(fmtShort(dayOf(idx[0]!)))} to ${esc(fmtShort(dayOf(idx[idx.length - 1]!)))} —
      both plates, ${cooking(w).length} days of cooking. Prices vary by shop, week,
      pack size and offer.</p></div>
  ${stepBar(w, 5)}
  ${list.total === null
    ? `<div class="banner">${ico('rice')}<div><b>No weekly total yet.</b>
        ${list.unpriced} of ${list.rows.length} lines have no price. A total built on
        part of the data would be a made-up number wearing a caveat, so the app shows
        nothing until every line is priced. Tap <b>add price</b> as you shop and it is
        kept for good.${list.rows.length - list.unpriced
          ? ` The ${list.rows.length - list.unpriced} marked <b>looked up</b> came from a real listing — tap one to see which.`
          : ''}</div></div>`
    : `<div class="banner ok">${ico('rice')}<div><b>${money(list.total)} for the week.</b>
        Every line priced from a real label.</div></div>`}
  ${order.map(g => listGroup(g, list, need)).join('')}
  ${list.owned.length ? `<div class="panel"><h3>Already in the cupboard</h3>
    <p style="margin-bottom:10px">Not on the list, but the week needs them — check before you leave.</p>
    ${list.owned.map(r => `<div class="gitem done"><span class="gn">${esc(r.name)}<em>${Math.round(r.need)} g needed</em></span>
      <button class="cbtn yes" data-have="${r.fid}">Put it back on the list</button></div>`).join('')}</div>` : ''}
  <div class="copybar"><button class="alt" data-step="4">Back</button>
    <button data-copyshop="1">Copy the list</button></div>`;
}

/* ----------------------------------------------------------------- router */

export function viewShop(): string {
  const w = state.shopWeek;
  const picker = `<div class="weeks">${Array.from({ length: WEEKS }, (_, i) =>
    `<button class="wk${i === w ? ' on' : ''}${state.plans[i] ? ' built' : ''}" data-week="${i}">${i + 1}</button>`
  ).join('')}</div>`;
  const body = ((): string => {
    if (state.step >= 3 && !state.plans[w]) { state.step = 0; }
    switch (state.step) {
      case 1: return viewMeals(w);
      case 2: return viewVeg(w);
      case 3: return viewWeekReview(w);
      case 4: return viewCupboard(w);
      case 5: return viewList(w);
      default: return viewDays(w);
    }
  })();
  return picker + body;
}

export { viewDays, viewMeals, viewVeg, viewWeekReview, viewCupboard, viewList, missingSlots };
export type { WeekPlan };
