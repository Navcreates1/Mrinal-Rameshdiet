/* extract.mjs — dump the legacy app's data model AND its computed behaviour to
   goldens.json.  This is the fixture the rebuild is measured against: if a
   refactor changes any number in here, it is a finding, not a tidy-up.

   It works by evaluating the legacy <script> block in a Node vm with a stub
   DOM, then calling the pure functions.  The functions are therefore the REAL
   ones, not a re-implementation — a re-implementation would agree with itself
   and prove nothing.

   Usage: node test-harness/extract.mjs [path-to-legacy-index.html]  */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const SRC = process.argv[2] || '../handover/legacy-index.html';
const html = fs.readFileSync(path.resolve(SRC), 'utf8');

const lines = html.split('\n');
const open = lines.findIndex(l => l.trim() === '<script>');
const close = lines.findIndex(l => l.trim() === '</script>');
if (open < 0 || close < 0) throw new Error('no <script> block found');

// Everything up to the storage section. Below that is save/load and the two
// boot IIFEs, which touch window.storage and the real DOM and add nothing here.
const cut = lines.findIndex((l, i) => i > open && l.includes('================= storage'));
const script = lines.slice(open + 1, cut > 0 ? cut : close).join('\n');

const noop = () => {};
// Callable proxy: el.addEventListener(...), el.classList.add(...) and friends all
// resolve to the same do-nothing thing, so the legacy script's DOM wiring runs
// without a DOM. Only the pure functions below are actually exercised.
const stubEl = new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive || k === 'toString' ? () => '' : stubEl),
  set: () => true,
  apply: () => stubEl,
  construct: () => stubEl,
});
const sandbox = {
  document: { addEventListener: noop, getElementById: () => stubEl, querySelector: () => stubEl, querySelectorAll: () => [], createElement: () => stubEl, body: stubEl },
  window: { addEventListener: noop, scrollTo: noop },
  navigator: { clipboard: { writeText: async () => {} } },
  localStorage: { getItem: () => null, setItem: noop },
  console,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
// `const` at the top level of a vm script lives in the script's lexical scope, not
// on the context object, so the bindings are handed out explicitly at the end.
const EXPORTS = ['F', 'M', 'POOL', 'CYCLE', 'FIXED', 'ROT', 'PEOPLE', 'SCALE', 'SLOTS',
                 'START', 'END', 'DAYS', 'dayOf', 'isVeg', 'gramsFor', 'ratioFor', 'per',
                 'swapGrams', 'packUp', 'bestCombo', 'mealK', 'isPulse', 'PULSE', 'state'];
vm.runInContext(
  script + `\n;globalThis.__x = { ${EXPORTS.join(', ')} };`,
  sandbox, { filename: 'legacy-index.html' });

const { F, M, POOL, CYCLE, FIXED, ROT, PEOPLE, SCALE, SLOTS, START, END, DAYS,
        dayOf, isVeg, gramsFor, ratioFor, per, swapGrams, packUp, bestCombo,
        mealK, isPulse, PULSE, state } = sandbox.__x;

const r4 = n => Math.round(n * 10000) / 10000;
const macro = o => ({ k: r4(o.k), p: r4(o.p), c: r4(o.c), f: r4(o.f), fb: r4(o.fb) });

/* --- per-meal, per-person: the gram weights actually served, and the totals --- */
const meals = {};
for (const [mid, m] of Object.entries(M)) {
  meals[mid] = { title: m.t, veg: m.v, icon: m.ic, method: m.m, plates: {} };
  for (const who of ['M', 'R']) {
    const rows = m.x.map(([fid, g, t]) => [fid, gramsFor(who, fid, g, t), t]);
    const tot = rows.reduce((a, [fid, g]) => {
      const q = per(fid, g);
      return { k: a.k + q.k, p: a.p + q.p, c: a.c + q.c, f: a.f + q.f, fb: a.fb + q.fb };
    }, { k: 0, p: 0, c: 0, f: 0, fb: 0 });
    meals[mid].plates[who] = { rows, total: macro(tot) };
  }
}

const dayTotal = (ids, who) => macro(ids.reduce((a, mid) => {
  const t = meals[mid].plates[who].total;
  return { k: a.k + t.k, p: a.p + t.p, c: a.c + t.c, f: a.f + t.f, fb: a.fb + t.fb };
}, { k: 0, p: 0, c: 0, f: 0, fb: 0 }));

/* --- the two seven-day cycles and the fixed plate, both people --- */
const cycles = {};
for (const type of ['nv', 'v']) {
  cycles[type] = CYCLE[type].map((ids, i) => ({ day: i + 1, ids, M: dayTotal(ids, 'M'), R: dayTotal(ids, 'R') }));
}
const fixed = {};
for (const type of ['nv', 'v']) fixed[type] = { ids: FIXED[type], M: dayTotal(FIXED[type], 'M'), R: dayTotal(FIXED[type], 'R') };

/* --- the calendar, day by day. 102 rows; 22 of them vegetarian. --- */
const calendar = [];
for (let i = 0; i < DAYS; i++) {
  const d = dayOf(i);
  calendar.push({ i, iso: d.toISOString().slice(0, 10), veg: isVeg(d) ? 1 : 0 });
}

/* --- every swap the engine can offer, with the grams it lands on --- */
const swaps = [];
const slotPools = { pro: 'pro_nv', carb: 'carb', veg: 'veg', fruit: 'fruit', fat: 'fat' };
for (const [mid, m] of Object.entries(M)) {
  for (const [fid, g, t] of m.x) {
    const poolName = t === 'pro' ? (m.v ? 'pro_v' : 'pro_nv') : slotPools[t];
    if (!poolName) continue;
    for (const to of POOL[poolName]) {
      if (to === fid) continue;
      swaps.push({ mid, from: fid, to, type: t, g, grams: swapGrams(t, fid, g, to) });
    }
  }
}

/* --- the pack solver on every food that carries pack sizes --- */
const packs = {};
for (const [fid, o] of Object.entries(F)) {
  if (!o.packs && !o.unit && !o.pack) continue;
  packs[fid] = {};
  for (const need of [50, 120, 260, 500, 900, 1290, 1850, 2600, 5000]) packs[fid][need] = packUp(fid, need);
}

const goldens = {
  _meta: {
    source: path.basename(SRC),
    bytes: html.length,
    extracted: new Date().toISOString(),
    note: 'Behaviour fixture for the rebuild. Regenerate only with a written reason in DECISIONS.md.',
  },
  counts: {
    foods: Object.keys(F).length,
    meals: Object.keys(M).length,
    days: DAYS,
    vegDays: calendar.filter(d => d.veg).length,
    weeks: Math.ceil(DAYS / 7),
    weakFoods: Object.values(F).filter(o => o.weak).length,
    pricedFoods: Object.values(F).filter(o => o.cost).length,
    countableFoods: Object.values(F).filter(o => o.unit).length,
    swapCases: swaps.length,
  },
  F, M: Object.fromEntries(Object.entries(M).map(([k, v]) => [k, { t: v.t, v: v.v, ic: v.ic, x: v.x, m: v.m }])),
  POOL, CYCLE, FIXED, ROT, PEOPLE, SCALE, SLOTS,
  calendar, meals, cycles, fixed, packs, swaps,
};

fs.mkdirSync('test-harness', { recursive: true });
fs.writeFileSync('test-harness/goldens.json', JSON.stringify(goldens, null, 1));
console.log('goldens.json written');
for (const [k, v] of Object.entries(goldens.counts)) console.log(`  ${k.padEnd(16)} ${v}`);
