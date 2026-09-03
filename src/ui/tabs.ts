/* Plan, Foods, Weight and Guide.

   Everything numeric on these screens is COMPUTED. The legacy versions restated
   the data as literal prose — BMR, TDEE, intake, shortfall, weekly loss, BMI,
   the scaling multipliers, "22 of 101", "chicken is 106 kcal per 100 g" — so
   changing one figure in the data left the explanation quietly lying about it.
   "22 of 101" was wrong even at the time: the plan is 102 days. */

import { F, FOOD_IDS, VERIFY } from '../data/foods.ts';
import { PEOPLE, SCALE, BANDS, KCAL_PER_KG, shortfall, lossPerWeek, bmi, mifflin } from '../data/people.ts';
import type { PersonId } from '../data/people.ts';
import { DAYS, WEEKS, dayOf, isFestivalVeg, FESTIVALS, fmtShort, START, END } from '../data/calendar.ts';
import { M } from '../data/meals.ts';
import { POOL } from '../data/pools.ts';
import { state, persist } from './state.ts';
import { ico } from './icons.ts';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n1 = (x: number): string => x.toFixed(1);

/* ------------------------------------------------------------------- Plan */

const vegDayCount = (): number => {
  let n = 0;
  for (let i = 0; i < DAYS; i++) if (isFestivalVeg(dayOf(i))) n++;
  return n;
};

function personColumn(id: PersonId): string {
  const p = PEOPLE[id];
  const weeks = DAYS / 7;
  return `<td><b>${p.name}</b></td>`;
}

export function viewPlan(): string {
  const veg = vegDayCount();
  const weeks = DAYS / 7;
  const row = (label: string, f: (p: PersonId) => string, note = ''): string =>
    `<tr><th>${label}${note ? `<em>${note}</em>` : ''}</th><td class="num">${f('M')}</td><td class="num">${f('R')}</td></tr>`;

  return `<div class="sec"><h2>Why the numbers are what they are</h2>
    <p>Nothing here is a round number chosen for looking sensible. Every figure is
       derived, and the derivation is shown so it can be challenged. ${DAYS} days,
       ${esc(fmtShort(START))} to ${esc(fmtShort(END))}, ${WEEKS} shopping weeks.</p></div>

  <div class="panel"><table class="ktable">
    <thead><tr><th></th>${personColumn('M')}${personColumn('R')}</tr></thead>
    <tbody>
      ${row('Age, height', p => `${PEOPLE[p].age} · ${PEOPLE[p].ht} cm`)}
      ${row('Now, and the goal', p => `${PEOPLE[p].start} → ${PEOPLE[p].goal} kg`)}
      ${row('BMI', p => `${n1(bmi(PEOPLE[p].start, PEOPLE[p].ht))} → ${n1(bmi(PEOPLE[p].goal, PEOPLE[p].ht))}`)}
      ${row('Resting rate', p => `${PEOPLE[p].bmr.toLocaleString('en-GB')} kcal`, 'Mifflin-St Jeor')}
      ${row('Activity factor', p => `×${PEOPLE[p].activity}`)}
      ${row('Estimated daily burn', p => `${PEOPLE[p].tdee.toLocaleString('en-GB')} kcal`)}
      ${row('Daily intake', p => `${PEOPLE[p].t.k.toLocaleString('en-GB')} kcal`)}
      ${row('Daily shortfall', p => `${shortfall(p)} kcal`)}
      ${row('Weekly shortfall', p => `${(shortfall(p) * 7).toLocaleString('en-GB')} kcal`)}
      ${row('Loss a week', p => `${n1(lossPerWeek(p))} kg`, `at ${KCAL_PER_KG.toLocaleString('en-GB')} kcal per kg`)}
      ${row(`By ${esc(fmtShort(END))}`, p => `${n1(lossPerWeek(p) * weeks)} kg`)}
      ${row('Protein', p => `${PEOPLE[p].t.p} g`, 'the meals deliver more, deliberately')}
      ${row('Carbohydrate', p => `${PEOPLE[p].t.c} g`)}
      ${row('Fat', p => `${PEOPLE[p].t.f} g`, `never under ${BANDS.M.fMin} / ${BANDS.R.fMin} g`)}
      ${row('Fibre', p => `${PEOPLE[p].t.fb} g`)}
    </tbody></table>
    <p class="src">Every figure above is computed from the profiles, not typed in.
      Change a target and this table changes with it.</p></div>

  <div class="panel"><h3>The two assumptions worth doubting</h3>
    <p><b>${PEOPLE.M.name}.</b> ${esc(PEOPLE.M.activityNote)}</p>
    <p><b>${PEOPLE.R.name} — the least reliable figure in the plan.</b> ${esc(PEOPLE.R.activityNote)}</p>
    <p class="src">Both metabolic rates are <b>estimated, not measured</b>. Everything
      else — every portion, every shopping quantity — stands on them. Three weekly
      weigh-ins replace the estimate with the real thing:
      <b>burn = intake + (kg lost × ${KCAL_PER_KG.toLocaleString('en-GB')} ÷ days)</b>.</p></div>

  <div class="panel"><h3>Why protein runs above target</h3>
    <p>The ISSN position stand puts 2.3–3.1 g/kg/day as the range for holding on to
      lean mass in a deficit. ${PEOPLE.M.name}'s ${PEOPLE.M.t.p} g target is
      ${n1(PEOPLE.M.t.p / PEOPLE.M.start)} g/kg of her weight now and
      ${n1(PEOPLE.M.t.p / PEOPLE.M.goal)} g/kg at goal — inside the general
      recommendation, below the maximise-retention band. The meals deliver more on
      purpose: the point of the protein is that the ${PEOPLE.M.start - PEOPLE.M.goal}
      kilograms lost are fat rather than muscle.</p></div>

  <div class="panel"><h3>One pan, two plates</h3>
    <p>${PEOPLE.R.name} is not a flat multiple of ${PEOPLE.M.name}. His food is about
      ${n1(PEOPLE.R.t.k / PEOPLE.M.t.k)}× hers overall, but that splits unevenly —
      protein tracks body weight, which is close between them, while carbohydrate and
      fat track the calorie gap, which is wide.</p>
    <table class="ktable"><tbody>
      <tr><th>Protein</th><td class="num">×${n1(SCALE.pro! * 100 / 100)}</td><td>${PEOPLE.R.t.p} ÷ ${PEOPLE.M.t.p}</td></tr>
      <tr><th>Carbohydrate</th><td class="num">×${SCALE.carb!.toFixed(2)}</td><td>${PEOPLE.R.t.c} ÷ ${PEOPLE.M.t.c}</td></tr>
      <tr><th>Fat</th><td class="num">×${SCALE.fat!.toFixed(2)}</td><td>${PEOPLE.R.t.f} ÷ ${PEOPLE.M.t.f}</td></tr>
      <tr><th>Vegetables, fruit</th><td class="num">×${SCALE.veg!.toFixed(2)}</td><td>volume, not macro matching</td></tr>
    </tbody></table>
    <p class="src">Rounded to the nearest 5 g, or 2.5 ml for oils.</p></div>

  <div class="panel"><h3>The vegetarian windows</h3>
    <p>${veg} of the ${DAYS} days. No meat, no fish, no eggs; dairy is fine.
      Any other day can be made vegetarian on the Shop tab.</p>
    <table class="ktable"><tbody>${FESTIVALS.map(f => {
      let days = 0;
      for (let i = 0; i < DAYS; i++) { const d = dayOf(i); if (d >= f.from && d <= f.to) days++; }
      return `<tr><th>${esc(f.name)}</th><td>${esc(fmtShort(f.from))} to ${esc(fmtShort(f.to))}</td><td class="num">${days} days</td></tr>`;
    }).join('')}</tbody></table>
    <p class="src">The windows do not line up with Monday-to-Sunday weeks. Of the
      ${WEEKS} shopping weeks, two are entirely vegetarian, three are mixed and ten
      are normal. <b>Every day is planned against its own status</b> — a mixed week is
      never rounded to whichever kind of day there are more of.</p></div>

  <div class="panel"><h3>How many different days are possible</h3>
    <p>${M ? Object.keys(M).length : 0} dishes, ${POOL.veg.length} vegetables,
      ${POOL.carb.length} carbohydrates and ${POOL.fruit.length} fruits in the swap
      pools. Every combination is computed from the ${FOOD_IDS.length}-ingredient
      database rather than stored, so all of them are arithmetically right.</p></div>`;
}

/* ------------------------------------------------------------------ Foods */

let foodQuery = '';
let foodFilter: 'all' | 'protein' | 'veg' | 'verify' | 'raw' = 'all';
export const setFoodQuery = (q: string): void => { foodQuery = q.toLowerCase(); };
export const setFoodFilter = (f: typeof foodFilter): void => { foodFilter = f; };

export function viewFoods(): string {
  const match = (id: string): boolean => {
    const o = F[id]!;
    if (foodQuery && !(`${o.n} ${o.s}`.toLowerCase().includes(foodQuery))) return false;
    if (foodFilter === 'protein') return o.p >= 8;
    if (foodFilter === 'veg') return POOL.veg.includes(id as never);
    if (foodFilter === 'verify') return o.weak === 1;
    if (foodFilter === 'raw') return Boolean(o.w);
    return true;
  };
  const rows = FOOD_IDS.filter(match);
  const chip = (k: typeof foodFilter, label: string): string =>
    `<button class="fchip${foodFilter === k ? ' on' : ''}" data-foodfilter="${k}">${label}</button>`;

  return `<div class="sec"><h2>Every ingredient, and where the number came from</h2>
    <p>${FOOD_IDS.length} ingredients, per 100 g unless the row says otherwise.
      This table is the single source of every gram figure in the app — nothing
      derived is stored, so a corrected value moves every screen at once.</p></div>
  <div class="panel">
    <input id="q" type="search" placeholder="Search ingredients" value="${esc(foodQuery)}" aria-label="Search ingredients">
    <div class="fchips">${chip('all', `All ${FOOD_IDS.length}`)}${chip('protein', 'Protein')}${chip('veg', 'Vegetables')}${chip('raw', 'Weigh raw or dry')}${chip('verify', `VERIFY (${VERIFY.length})`)}</div>
  </div>
  ${foodFilter === 'verify' ? `<div class="banner warn">${ico('greens')}<div>
    <b>${VERIFY.length} of ${FOOD_IDS.length} values are aggregator-sourced or disputed between sources.</b>
    They are used because they are the best available, and flagged because they are not solid.
    The lower figure was taken in every case, never an average.</div></div>` : ''}
  <div class="panel">${rows.length === 0 ? '<p>Nothing matches that.</p>' : rows.map(id => {
    const o = F[id]!;
    return `<div class="frow">
      <span class="fi">${ico(o.i)}</span>
      <span class="fn">${esc(o.n)}${o.weak ? '<span class="pill w">VERIFY</span>' : ''}
        ${o.w ? `<span class="wbadge ${o.w === 'dry' ? 'dry' : ''}">weigh ${o.w}</span>` : ''}
        <em>${esc(o.s)}</em>
        <em class="srcline">${esc(o.src)}</em></span>
      <span class="fm">
        <b class="num">${o.k}</b><i>kcal</i>
        <b class="num" style="color:var(--chilli)">${o.p}</b><i>P</i>
        <b class="num" style="color:var(--turmeric)">${o.c}</b><i>C</i>
        <b class="num" style="color:var(--indigo)">${o.f}</b><i>F</i>
        <b class="num" style="color:var(--leaf)">${o.fb}</b><i>fibre</i></span>
    </div>`;
  }).join('')}</div>
  <p class="src center">${rows.length} of ${FOOD_IDS.length} shown.
    ${o_units()}</p>`;
}
const o_units = (): string =>
  'Oils are per 100 ml. Everything else per 100 g. Raw and dry weights are what you put on the scale.';

/* ----------------------------------------------------------------- Weight */

export function viewWeight(): string {
  const who = state.logWho;
  const p = PEOPLE[who];
  const log = [...(state.weights[who] ?? [])].sort((a, b) => a.d - b.d);
  const lo = Math.min(p.goal - 2, ...log.map(x => x.kg), p.start - 1);
  const hi = Math.max(p.start + 2, ...log.map(x => x.kg));
  const x = (d: number): number => 8 + (d / (DAYS - 1)) * 84;
  const y = (kg: number): number => 8 + ((hi - kg) / Math.max(1, hi - lo)) * 74;

  const pace = log.length >= 2
    ? (() => {
        const a = log[0]!, b = log[log.length - 1]!;
        const days = Math.max(1, b.d - a.d);
        const perWeek = ((a.kg - b.kg) / days) * 7;
        const burn = p.t.k + ((a.kg - b.kg) * KCAL_PER_KG) / days;
        return { perWeek, burn, days };
      })()
    : null;

  return `<div class="sec"><h2>Weight</h2>
    <p>Optional — both of them track this in Cronometer. It is here because three
      weigh-ins are what replace the estimated metabolic rate with a measured one.</p></div>
  <div class="whobar2">
    ${(['M', 'R'] as const).map(k => `<button class="${who === k ? 'on' : ''}" data-logwho="${k}">${PEOPLE[k].name}</button>`).join('')}
  </div>
  <div class="panel">
    <svg class="chart" viewBox="0 0 100 90" preserveAspectRatio="none" aria-label="Weight against the pace to goal">
      <line x1="${x(0)}" y1="${y(p.start)}" x2="${x(DAYS - 1)}" y2="${y(p.goal)}" class="pace"/>
      ${log.length > 1 ? `<polyline class="line" points="${log.map(w => `${x(w.d)},${y(w.kg)}`).join(' ')}"/>` : ''}
      ${log.map(w => `<circle cx="${x(w.d)}" cy="${y(w.kg)}" r="1.4" class="dot"/>`).join('')}
    </svg>
    <p class="src">The straight line is the pace to ${p.goal} kg by ${esc(fmtShort(END))}.
      Range shown: ${lo.toFixed(0)}–${hi.toFixed(0)} kg, from the real entries — not a fixed window.</p>
  </div>
  <div class="panel"><h3>Add a weigh-in</h3>
    <p style="margin-bottom:10px">Same morning, same scale, after the loo and before breakfast.</p>
    <div class="wadd"><input id="wkg" type="number" step="0.1" min="30" max="200" placeholder="kg" aria-label="Weight in kilograms">
      <button id="wAdd">Log for ${p.name}</button></div>
    ${log.length ? `<div class="wlist">${[...log].reverse().map(w =>
      `<div class="wrow2"><span>${esc(fmtShort(dayOf(w.d)))}</span><b class="num">${w.kg.toFixed(1)} kg</b></div>`).join('')}</div>` : ''}
  </div>
  ${pace ? `<div class="panel"><h3>What the scale says about the estimate</h3>
    <p>Over ${pace.days} days at ${p.t.k.toLocaleString('en-GB')} kcal a day, the loss works
      out at <b>${n1(pace.perWeek)} kg a week</b>. That makes the real burn about
      <b>${Math.round(pace.burn).toLocaleString('en-GB')} kcal</b>, against the estimated
      ${p.tdee.toLocaleString('en-GB')} — a difference of ${Math.round(Math.abs(pace.burn - p.tdee))} kcal.</p>
    <p class="src">${log.length < 3
      ? `Three weigh-ins at least a week apart before this means much. ${log.length} so far.`
      : 'Enough entries to take seriously. If the gap is large, the targets should move.'}</p></div>` : ''}`;
}

export function logWeight(kg: number): boolean {
  if (!(kg >= 30 && kg <= 200)) return false;
  const arr = state.weights[state.logWho] ?? (state.weights[state.logWho] = []);
  const i = arr.findIndex(w => w.d === state.day);
  if (i >= 0) arr[i] = { d: state.day, kg };
  else arr.push({ d: state.day, kg });
  arr.sort((a, b) => a.d - b.d);
  persist();
  return true;
}

/* ------------------------------------------------------------------ Guide */

export function viewGuide(): string {
  const oilPerTbsp = Math.round(F.oil!.k * 0.15);
  const lowKcal = ['lauki', 'ashgourd', 'cucumber', 'karela', 'spinach']
    .map(id => `${F[id]!.n.split(' / ')[0]} is ${F[id]!.k}`).join(', ');
  return `<div class="sec"><h2>The seven rules</h2>
    <p>Everything else is detail.</p></div>
  <div class="panel"><ol class="rules">
    <li><b>Weigh it raw or dry.</b> ${F.chicken!.n} is ${F.chicken!.k} kcal per 100 g raw and
      ${Math.round(F.chicken!.k / F.chicken!.cv!)} cooked. Dry rice is ${F.rice!.k}; cooked it is
      about ${Math.round(F.rice!.k / F.rice!.cv!)}. Getting this backwards is roughly 200 kcal a
      day, which is the entire deficit.</li>
    <li><b>Measure the oil.</b> A tablespoon is about ${oilPerTbsp} kcal. Free-pouring twice a
      day is a kilogram a month that nobody can account for.</li>
    <li><b>The yoghurt and the whey are not optional.</b> On a vegetarian day they carry roughly
      half the protein. Dal cannot do it alone — at this calorie level a dal-led day lands near
      70 g, which is where muscle starts going instead of fat.</li>
    <li><b>Vegetables are free volume.</b> ${esc(lowKcal)} kcal per 100 g. At
      ${PEOPLE.M.t.k.toLocaleString('en-GB')} kcal, cutting these is what makes a diet feel like
      starving.</li>
    <li><b>Count the almonds.</b> 10 g is about eight and ${Math.round(F.almond!.k * 0.1)} kcal.
      A handful is three times that.</li>
    <li><b>Three meals.</b> Bigger plates, more protein per sitting, fewer decisions. Something
      later is available and comes out of the day's budget rather than on top of it.</li>
    <li><b>Log it the same day.</b> Cronometer is the record; this app is the prescription.
      The Copy button on Today puts the whole day on the clipboard.</li>
  </ol></div>

  <div class="panel"><h3>Supplements</h3>
    <p><b>Vitamin D.</b> The NHS advises all UK adults consider 10 µg (400 IU) daily through
      autumn and winter. Anyone previously treated for deficiency usually needs 20–50 µg
      (800–2,000 IU) year-round. The SACN upper limit is 100 µg (4,000 IU).</p>
    <p><b>B12.</b> A known deficiency plus ${vegDayCount()} egg-free, meat-free days reduces
      dietary intake further. Keep supplementing year-round.</p>
    <p><b>Creatine.</b> 3–5 g daily. The case is stronger for a vegetarian, who starts with a
      lower muscle creatine pool, and it is well supported for strength in
      resistance-training women.</p>
    <p><b>Iron.</b> A real risk for a menstruating vegetarian in a deficit.
      <b>Test ferritin rather than supplementing blind.</b></p>
    <p><b>For ${PEOPLE.R.name}.</b> Repeat the lipid panel at 12 weeks. The fibre target is
      ${PEOPLE.R.t.fb} g rather than ${PEOPLE.M.t.fb} for exactly this reason.</p></div>

  <div class="panel"><h3>When it stalls</h3>
    <p>Two weeks with no movement is normal. Four is a signal. In order: check the oil is
      being measured, check the weekend is being logged, then recalculate the burn from the
      real weigh-ins on the Weight tab rather than trusting the estimate.</p>
    <p class="src"><b>Nobody clinical has seen this plan.</b> Two people with real flags — a
      known vitamin D and B12 deficiency, and raised cholesterol — and no dietitian or GP has
      reviewed it. Run it past one.</p></div>`;
}
