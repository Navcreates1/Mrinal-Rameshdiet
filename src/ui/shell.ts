/* The shell: header, date strip, tab bar, bottom sheets and every event.

   One render function. Any interaction ends in draw(), which rebuilds the page
   from state. At this size that is simpler than diffing and impossible to get
   subtly out of sync. */

import { F } from '../data/foods.ts';
import { M } from '../data/meals.ts';
import { PEOPLE } from '../data/people.ts';
import type { PersonId } from '../data/people.ts';
import { DAYS, WEEKS, dayOf, fmtShort, fmtLong, festivalOn, END } from '../data/calendar.ts';
import { ROT } from '../data/cycle.ts';
import { LABEL } from '../data/pools.ts';
import { swapOptions, makeSwap } from '../lib/swap.ts';
import { solveDay } from '../lib/portion.ts';
import { buildList, GROUP_LABEL } from '../lib/shopping.ts';
import { canSave } from '../lib/storage.ts';
import { dayText, shopText, copy } from '../lib/cronometer.ts';
import { state, persist, restore, resetAll, isVegDay, dayType, setDayType, reasonFor, emptyPicks } from './state.ts';
import type { TabId, DayType, Who } from './state.ts';
import { viewToday, todayPlan, solveToday } from './today.ts';
import { viewPlan, viewFoods, viewWeight, viewGuide, logWeight, setFoodQuery, setFoodFilter } from './tabs.ts';
import { viewShop, build, offered, suggestFor, vegNeededBy, needsFor, MIN_PER_SLOT } from './shop.ts';
import { SPRITE, ico } from './icons.ts';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const TABS: [TabId, string, string][] = [
  ['today', 'Today', 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  ['shop', 'Shop', 'M4 7h16l-1.2 12.1a1 1 0 0 1-1 .9H6.2a1 1 0 0 1-1-.9zM9 7V5a3 3 0 0 1 6 0v2'],
  ['plan', 'Plan', 'M4 4h16v16H4zM8 4v16M4 10h16'],
  ['foods', 'Foods', 'M6 3v18M6 3c2 0 3 2 3 4s-1 4-3 4M15 3c-1.5 2-2 4-2 6 0 4 2 5 3 5v7'],
  ['weight', 'Weight', 'M4 19h16M6 19l3-11h6l3 11M9 8a3 3 0 0 1 6 0'],
  ['guide', 'Guide', 'M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2zM8 7h8M8 11h8M8 15h5'],
];

const el = (id: string): HTMLElement => document.getElementById(id)!;

/* ------------------------------------------------------------------ chrome */

function drawHero(): void {
  const veg = state.tab === 'today' && isVegDay(state.day);
  const hero = el('hero');
  hero.className = 'hero' + (veg ? ' veg' : '');
  const left = Math.max(0, DAYS - 1 - state.day);
  el('heroName').textContent = state.tab === 'today' ? fmtLong(dayOf(state.day)) : 'Consistency is key';
  el('goalRow').innerHTML = state.tab === 'today'
    ? `<span><b class="num">${left}</b> days left</span><span><b class="num">${Math.floor(state.day / 7) + 1}</b> of ${WEEKS} weeks</span>`
    : `<span>${esc(fmtShort(dayOf(0)))} to ${esc(fmtShort(END))}</span><span><b class="num">${DAYS}</b> days</span>`;
  el('whoBar').innerHTML = (['both', 'M', 'R'] as Who[]).map(k =>
    `<button class="${state.who === k ? 'on' : ''}" data-who="${k}">${k === 'both' ? 'Both plates' : PEOPLE[k as PersonId].name}</button>`).join('');
}

function drawStrip(): void {
  const strip = el('strip');
  strip.hidden = state.tab !== 'today';
  if (state.tab !== 'today') return;
  strip.innerHTML = Array.from({ length: DAYS }, (_, i) => {
    const t = dayType(i);
    return `<button class="chip${i === state.day ? ' on' : ''}${t === 'vegetarian' ? ' veg' : ''}${t === 'out' ? ' out' : ''}"
      data-day="${i}">${esc(fmtShort(dayOf(i)))}</button>`;
  }).join('');
  strip.querySelector('.chip.on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
}

function drawNav(): void {
  el('nav').innerHTML = TABS.map(([id, label, path]) =>
    `<button class="${state.tab === id ? 'on' : ''}" data-tab="${id}" aria-current="${state.tab === id}">
      <svg viewBox="0 0 24 24"><path d="${path}"/></svg><span>${label}</span></button>`).join('');
}

/* Whatever goes wrong, the screen says something.

   A partial object in localStorage used to throw inside the Today view and
   leave a white page below the header, with no route back but clearing site
   data. Mrinal and Ramesh will not open a console. state.ts now validates
   everything on read, so this should never fire — which is exactly why it has
   to exist: the failure it catches is the one nobody predicted. */
function crashScreen(err: unknown, where: string): string {
  const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return `<div class="sec"><h2>Something went wrong on this screen</h2>
    <p>The rest of the app still works — try another tab first. If it keeps
       happening, starting again clears the saved plan on this device. Weigh-ins
       go too, so write them down first if they matter.</p></div>
  <div class="panel">
    <p><b>What broke:</b> the ${esc(where)} screen.</p>
    <p class="src">${esc(detail)}</p>
    <div class="copybar" style="margin-top:14px">
      <button class="alt" data-tab="today">Back to Today</button>
      <button data-reset="1">Start again</button>
    </div>
  </div>`;
}

export function draw(): void {
  const views: Record<TabId, () => string> = {
    today: viewToday, shop: viewShop, plan: viewPlan,
    foods: viewFoods, weight: viewWeight, guide: viewGuide,
  };
  let body: string;
  try {
    body = views[state.tab]();
  } catch (err) {
    console.error(`[draw] ${state.tab} failed`, err);
    body = crashScreen(err, state.tab);
  }
  el('main').innerHTML =
    (!canSave() ? `<div class="banner warn">${ico('rice')}<div><b>Nothing typed here will be kept.</b>
      This browser is blocking storage — private mode, most likely. Weigh-ins, prices and
      cupboard answers will vanish on reload.</div></div>` : '') + body;
  try { drawHero(); drawStrip(); drawNav(); } catch (err) { console.error('[draw] chrome failed', err); }
  window.scrollTo({ top: 0 });
}

/* ------------------------------------------------------------------ sheets */

function openSheet(title: string, sub: string, body: string): void {
  el('sheetTitle').textContent = title;
  el('sheetSub').textContent = sub;
  el('sheetBody').innerHTML = body;
  el('sheet').classList.add('on');
  el('scrim').classList.add('on');
}

export function closeSheet(): void {
  el('sheet').classList.remove('on');
  el('scrim').classList.remove('on');
}

function openSwap(key: string): void {
  const [day, slot, mid, idxs] = key.split(':');
  const i = Number(idxs);
  const meal = M[mid!]!;
  const line = meal.x[i]!;
  const [fid, , type] = line;
  const sol = solveToday(Number(day), 'M');
  const solved = sol.meals.find(m => m.mid === mid);
  const grams = solved?.rows[i]?.[1] ?? line[1];
  const opts = swapOptions(type, solved?.rows[i]?.[0] ?? fid, grams, isVegDay(Number(day)));

  openSheet(
    `Change the ${LABEL[type].toLowerCase()}`,
    `In ${meal.t}. Every option is rescaled to do the same job, and the cost is shown before you choose.`,
    opts.map(o => `<button class="swapopt${o.current ? ' on' : ''}" data-doswap="${esc(key)}" data-to="${o.fid}">
      <span class="so-n">${esc(o.name)}${o.current ? ' <i>now</i>' : ''}
        ${F[o.fid]!.w ? `<span class="wbadge ${F[o.fid]!.w === 'dry' ? 'dry' : ''}">weigh ${F[o.fid]!.w}</span>` : ''}</span>
      <span class="so-g">${F[o.fid]!.ml ? o.grams + ' ml' : o.grams + ' g'}</span>
      <span class="so-d">${o.current ? '' :
        `<b style="color:${o.dp >= 0 ? 'var(--leaf)' : 'var(--chilli)'}">${o.dp >= 0 ? '+' : ''}${o.dp} g P</b>
         <i>${o.dk >= 0 ? '+' : ''}${o.dk} kcal</i>`}</span>
    </button>`).join(''));
}

function openMealPick(day: number, slot: string): void {
  const veg = isVegDay(day);
  const pool = slot === 'x'
    ? [...ROT[veg ? 'v' : 'nv'].mm!, ...ROT[veg ? 'v' : 'nv'].s!]
    : ROT[veg ? 'v' : 'nv'][slot]!;
  const current = todayPlan(day).core[['b', 'l', 'd'].indexOf(slot)];
  openSheet(
    `Change ${slot === 'b' ? 'breakfast' : slot === 'l' ? 'lunch' : 'dinner'}`,
    veg ? 'Vegetarian day — these are the dishes with no meat, fish or eggs.' : 'For today only. The week plan is not changed.',
    pool.map(id => {
      const t = solveDay([id], [], 'M', 'reference').total;
      return `<button class="swapopt${id === current ? ' on' : ''}" data-doslot="${day}:${slot}" data-mid="${id}">
        <span class="so-n">${esc(M[id]!.t)}${id === current ? ' <i>now</i>' : ''}</span>
        <span class="so-g">${Math.round(t.k)} kcal</span>
        <span class="so-d"><b>${t.p.toFixed(0)} g P</b></span></button>`;
    }).join(''));
}

function openPrice(fid: string): void {
  const o = F[fid]!;
  const unit = o.unit ? `per ${o.unit.s}` : o.ml ? 'per litre' : 'per kilogram';
  const now = state.prices[fid] ?? o.cost;
  openSheet(
    `Price of ${o.n}`,
    `The price ${unit}, off the label. ${o.psrc ? 'Currently an approximate figure: ' + o.psrc : 'Not known yet — nothing is guessed.'}`,
    `<div class="wadd"><input id="pkg" type="number" step="0.01" min="0" placeholder="£ ${unit}"
        value="${now !== undefined ? now : ''}" aria-label="Price ${unit}">
      <button data-setprice="${fid}">Save</button></div>
     <p class="src">Whatever you type replaces the estimate on this device for good, and feeds
       the weekly total. A price is only ever a real one — either read off a label by you, or
       one of the seven that were actually looked up.</p>`);
}

/* ------------------------------------------------------------------ events */

async function copyTo(btn: HTMLElement, text: string): Promise<void> {
  const was = btn.textContent;
  const done = await copy(text);
  btn.textContent = done ? 'Copied' : 'Press and hold to copy';
  setTimeout(() => { btn.textContent = was; }, 1800);
}

function toggle(list: string[], id: string): void {
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1); else list.push(id);
}

function onClick(e: Event): void {
  const t = (e.target as HTMLElement).closest('[data-tab],[data-reset],[data-day],[data-who],[data-mode],[data-step],[data-week],[data-daytype],[data-pickmeal],[data-pickveg],[data-suggest],[data-suggestveg],[data-wantlater],[data-buildweek],[data-have],[data-tick],[data-price],[data-setprice],[data-swap],[data-doswap],[data-pickslot],[data-doslot],[data-copyday],[data-copyshop],[data-logwho],[data-foodfilter],#wAdd,#sheetClose') as HTMLElement | null;
  if (!t) return;
  const d = t.dataset;

  if (d.reset) {
    if (!confirm('Clear the saved plan on this device and start again?\n\nWeigh-ins, prices and cupboard answers go too.')) return;
    resetAll();
    return draw();
  }
  if (d.tab) { state.tab = d.tab as TabId; persist(); return draw(); }
  if (d.day) { state.day = Number(d.day); return draw(); }
  if (d.who) { state.who = d.who as Who; persist(); return draw(); }
  if (d.mode) { state.mode = d.mode as 'choose' | 'fixed'; persist(); return draw(); }
  if (d.logwho) { state.logWho = d.logwho as PersonId; persist(); return draw(); }
  if (d.foodfilter) { setFoodFilter(d.foodfilter as 'all'); return draw(); }

  /* ---- the Shop journey ---- */
  if (d.step) { state.step = Number(d.step); return draw(); }
  if (d.week) { state.shopWeek = Number(d.week); state.step = state.plans[Number(d.week)] ? 5 : 0; return draw(); }
  if (d.daytype) {
    const [i, type] = d.daytype.split(':');
    const idx = Number(i);
    /* Moving a festival day off vegetarian is possible but never accidental.
       Weeks 6 and 8 once served meat on three fasting days; that came from a
       majority vote, not a choice, and the difference is the whole point. */
    if (reasonFor(idx) && type !== 'vegetarian') {
      const why = reasonFor(idx);
      if (!confirm(`${fmtLong(dayOf(idx))} falls in ${why}. Serving meat, fish or eggs breaks the fast.\n\nChange it anyway?`)) return;
    }
    setDayType(idx, type as DayType);
    delete state.plans[state.shopWeek];
    return draw();
  }
  if (d.pickmeal && d.mid) {
    toggle(state.picks[d.pickmeal as 'b'] as string[], d.mid);
    delete state.plans[state.shopWeek];
    persist(); return draw();
  }
  if (d.suggest) {
    const slot = d.suggest as 'b';
    const want = suggestFor(state.shopWeek, slot);
    const list = state.picks[slot] as string[];
    for (const id of want) if (!list.includes(id)) list.push(id);
    delete state.plans[state.shopWeek];
    persist(); return draw();
  }
  if (d.pickveg) { toggle(state.picks.veg, d.pickveg); persist(); return draw(); }
  if (d.suggestveg) {
    const want = vegNeededBy([...state.picks.b, ...state.picks.l, ...state.picks.d]);
    for (const id of want) if (!state.picks.veg.includes(id)) state.picks.veg.push(id);
    persist(); return draw();
  }
  if (d.wantlater) {
    state.picks.wantLater = !state.picks.wantLater;
    if (state.picks.wantLater && !state.picks.later.length)
      state.picks.later = suggestFor(state.shopWeek, 'later');
    delete state.plans[state.shopWeek];
    persist(); return draw();
  }
  if (d.buildweek) {
    const res = build(Number(d.buildweek));
    if (!res.ok) {
      const main = el('main');
      const old = document.getElementById('bErr');
      old?.remove();
      main.insertAdjacentHTML('afterbegin',
        `<div class="banner bad" id="bErr">${ico('chicken')}<div><b>Not yet.</b> ${esc(res.why)}</div></div>`);
      window.scrollTo({ top: 0 });
      return;
    }
    state.step = 3;
    return draw();
  }
  if (d.have) { state.have[d.have] = !state.have[d.have]; persist(); return draw(); }
  if (d.tick) { state.ticked[d.tick] = !state.ticked[d.tick]; persist(); return; }
  if (d.price) { return openPrice(d.price); }
  if (d.setprice) {
    const v = Number((document.getElementById('pkg') as HTMLInputElement).value);
    if (v > 0) { state.prices[d.setprice] = v; persist(); }
    closeSheet(); return draw();
  }

  /* ---- Today ---- */
  if (d.swap) return openSwap(d.swap);
  if (d.doswap && d.to) {
    const [, , mid, i] = d.doswap.split(':');
    const idx = Number(i);
    if (M[mid!]!.x[idx]![0] === d.to) delete state.swaps[d.doswap];
    else state.swaps[d.doswap] = makeSwap(mid!, idx, d.to);
    persist(); closeSheet(); return draw();
  }
  if (d.pickslot) { const [day, slot] = d.pickslot.split(':'); return openMealPick(Number(day), slot!); }
  if (d.doslot && d.mid) {
    state.slotPick[d.doslot] = d.mid;
    persist(); closeSheet(); return draw();
  }
  if (d.copyday) {
    const who = d.copyday as Who;
    const text = who === 'both'
      ? `${dayText(state.day, 'M', solveToday(state.day, 'M'))}\n\n— — —\n\n${dayText(state.day, 'R', solveToday(state.day, 'R'))}`
      : dayText(state.day, who as PersonId, solveToday(state.day, who as PersonId));
    void copyTo(t, text);
    return;
  }
  if (d.copyshop) {
    const list = buildList(needsFor(state.shopWeek), { have: state.have, prices: state.prices });
    void copyTo(t, shopText((Object.keys(list.groups) as (keyof typeof list.groups)[]).map(g => ({
      label: GROUP_LABEL[g], note: '',
      lines: list.groups[g].map(r => `${r.name} — ${r.pack.count ? r.pack.note : (r.pack.note || Math.round(r.need) + ' g')}`),
    }))));
    return;
  }

  if (t.id === 'wAdd') {
    const input = document.getElementById('wkg') as HTMLInputElement;
    if (logWeight(Number(input.value))) draw();
    else { input.setAttribute('aria-invalid', 'true'); input.focus(); }
    return;
  }
  if (t.id === 'sheetClose') return closeSheet();
}

/* -------------------------------------------------------------------- boot */

export function boot(): void {
  document.body.insertAdjacentHTML('afterbegin', SPRITE);
  /* If restore itself throws, start from defaults rather than never rendering. */
  try { restore(); } catch (err) { console.error('[boot] restore failed, starting clean', err); }
  document.addEventListener('click', onClick);
  document.getElementById('scrim')!.addEventListener('click', closeSheet);
  document.addEventListener('input', e => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'q') { setFoodQuery(t.value); const at = t.selectionStart; draw();
      const again = document.getElementById('q') as HTMLInputElement | null;
      if (again) { again.focus(); again.setSelectionRange(at ?? 0, at ?? 0); } }
  });
  document.addEventListener('keydown', e => { if ((e as KeyboardEvent).key === 'Escape') closeSheet(); });
  /* Last line of defence: a listener that cannot itself be the thing that
     breaks. If a click handler throws, the next draw still happens. */
  window.addEventListener('error', () => {
    if (el('main').innerHTML.trim().length < 40) { state.tab = 'today'; draw(); }
  });
  draw();
}

export { offered, MIN_PER_SLOT, emptyPicks, festivalOn, WEEKS };
