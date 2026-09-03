/* uat.mjs — the interface, in a real browser, against the built file.
 *
 * Nothing here is a claim made from reading code. It serves index.html over
 * HTTP (localStorage behaves differently on file://, and the app is hosted at a
 * URL) and drives it.
 *
 * The centrepiece is section 3: the Shop walk-through Naveen never finished.
 * "I haven't really tried build a week because I got fed up." A test that stops
 * at step 2 would have passed on the version he gave up on.
 */
import { chromium } from 'playwright';
import { serve } from './serve.mjs';

const { url: URLBASE, close: closeServer } = await serve(8788);

let passed = 0; const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(Object.is(a, b), `${m}\n      expected ${JSON.stringify(b)}, actual ${JSON.stringify(a)}`);

/* Fail loudly rather than sit at 100% forever: a hung wait is a defect in the
   test, and a test that hangs teaches nothing. */
const HARD_LIMIT = setTimeout(() => {
  console.error('uat: TIMED OUT after 4 minutes — something is waiting on a condition that never comes');
  process.exit(1);
}, 240000);
HARD_LIMIT.unref?.();

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
page.on('dialog', d => d.accept());

await page.goto(URLBASE, { waitUntil: 'commit' });
await page.waitForSelector('#nav button', { timeout: 20000 });

console.error('  [uat] 1. it loads, and it loads clean');
/* ---------- 1. it loads, and it loads clean ---------- */
eq(errors.length, 0, `the page loads with no runtime errors:\n      ${errors.slice(0, 3).join('\n      ')}`);
ok(await page.locator('#main').innerHTML() !== '', 'the main area renders something');
eq(await page.locator('#nav button').count(), 6, 'six tabs — Foods was silently dropped once before');
for (const label of ['Today', 'Shop', 'Plan', 'Foods', 'Weight', 'Guide'])
  ok(await page.locator(`#nav button:has-text("${label}")`).count() === 1, `the ${label} tab exists`);

console.error('  [uat] 2. Today: three meals, not five');
/* ---------- 2. Today: three meals, not five ---------- */
const meals = await page.locator('.meal').count();
eq(meals, 3, 'Today shows three meals. Eating six times a day was never the ask');
const slotLabels = await page.locator('.meal .mt b').allTextContents();
eq(slotLabels.join(','), 'Breakfast,Lunch,Dinner', 'and they are breakfast, lunch and dinner');
eq(await page.locator('.miniring').count(), 2, 'both people get a ring');
for (const line of await page.locator('.ing .g i').allTextContents().then(a => [...new Set(a)]))
  ok(['Mrinal', 'Ramesh', 'in the pan'].includes(line), `every ingredient line names its plate ("${line}")`);
ok(await page.locator('.wbadge').count() > 0, 'raw and dry badges are visible, not the faintest grey on the page');

console.error('  [uat] 3. THE WALK-THROUGH HE NEVER FINISHED');
/* ---------- 3. THE WALK-THROUGH HE NEVER FINISHED ---------- */
await page.click('#nav button:has-text("Shop")');
await page.waitForSelector('.steps');

/* Step 1 — the day type. Week 1 has no festival days, which is exactly why the
   old version never asked and served four non-vegetarian lunches. */
eq(await page.locator('.dayrow').count(), 7, 'step 1 lists all seven days');
eq(await page.locator('.dtype').count(), 21, 'each day offers Normal, Vegetarian and Eating out');
const vegBefore = await page.locator('.dtype.on:has-text("Vegetarian")').count();
eq(vegBefore, 0, 'week 1 has no festival days, so none is vegetarian by default');

await page.click('.dayrow:nth-of-type(3) .dtype:has-text("Vegetarian")');
await page.waitForTimeout(120);
eq(await page.locator('.dtype.on:has-text("Vegetarian")').count(), 1,
   'tapping Vegetarian on a normal day makes it vegetarian — the calendar is a default, not a verdict');
await page.click('.dayrow:nth-of-type(6) .dtype:has-text("Eating out")');
await page.waitForTimeout(120);
eq(await page.locator('.dtype.on:has-text("Eating out")').count(), 1, 'and a day can be dropped');

/* Step 2 — meals. Nothing pre-selected, and the vegetarian dishes are now here. */
await page.click('.copybar button:has-text("Next")');
await page.waitForSelector('.opt');
eq(await page.locator('.opt.on').count(), 0,
   'NOTHING is pre-selected. "everything is selected automatically where it should be unselected"');
ok(await page.locator('text=For the vegetarian days').count() > 0,
   'the vegetarian dishes appear now that one day is vegetarian. "it gave me four lunch options, but everything is non-veg"');
const lunchOpts = await page.locator('.panel:has(h3:has-text("Lunch")) .opt').count();
ok(lunchOpts >= 8, `lunch now offers ${lunchOpts} dishes across both day types, not four non-vegetarian ones`);
ok(await page.locator('.linkbtn:has-text("Pick a good set for me")').count() >= 3,
   'every slot has a one-tap escape hatch, so opting in is never a chore');

/* Try to build with nothing chosen — it must refuse, and say which slot. */
await page.click('.copybar button:has-text("Next")');
await page.waitForSelector('.vchip');
eq(await page.locator('.vchip.on').count(), 0, 'no vegetable is pre-selected either');
await page.click('button:has-text("Build the week")');
await page.waitForTimeout(200);
ok(await page.locator('#bErr').count() === 1,
   'building with nothing chosen is REFUSED. The old poolFor silently used the full list instead');
const why = await page.locator('#bErr').innerText();
ok(/Breakfast|Lunch|Dinner/.test(why), `and the blocked slot is named ("${why.slice(0, 90)}")`);

/* Now pick properly and build. */
await page.click('.copybar button:has-text("Back")');
await page.waitForSelector('.opt');
for (const slot of ['b', 'l', 'd']) await page.click(`.linkbtn[data-suggest="${slot}"]`);
await page.waitForTimeout(150);
const chosen = await page.locator('.opt.on').count();
ok(chosen >= 6, `"Pick for me" filled ${chosen} dishes in three taps`);

await page.click('.copybar button:has-text("Next")');
await page.waitForSelector('.vchip');
await page.click('.linkbtn:has-text("Pick the ones these meals need")');
await page.waitForTimeout(150);
ok(await page.locator('.vchip.on').count() >= 4, 'and the vegetables those meals need are selected');

await page.click('button:has-text("Build the week")');
await page.waitForTimeout(400);
eq(await page.locator('#bErr').count(), 0, 'THE WEEK BUILDS');
ok(await page.locator('.wrow').count() >= 6, 'step 4 shows the week, day by day');
ok(await page.locator('.banner.ok:has-text("no meat, fish or eggs")').count() === 1,
   'and it says so: no meat, fish or eggs on any fasting day');
ok(await page.locator('.wrow.veg').count() === 1, 'the day marked vegetarian is shown as vegetarian');
ok(await page.locator('.wrow.off').count() === 1, 'and the eating-out day is dropped');

await page.click('.copybar button:has-text("Next")');
await page.waitForSelector('[data-have]');
const cupboard = await page.locator('[data-have]').count();
ok(cupboard > 5, `step 5 asks about ${cupboard} items`);
await page.click('[data-have]');
await page.waitForTimeout(150);

await page.click('.copybar button:has-text("Next")');
await page.waitForSelector('.gitem');
const listRows = await page.locator('.gitem').count();
ok(listRows > 5, `THE LIST IS REACHED — ${listRows} lines`);
ok(await page.locator('h3:has-text("Supermarket")').count() >= 1, 'split by shop');
ok(await page.locator('.banner:has-text("No weekly total yet")').count() === 1,
   'no total is claimed while prices are unknown. A caveat under an invented number is not a fix');
const eggRow = await page.locator('.gitem:has-text("egg")').first();
if (await eggRow.count()) ok(!/\d\.\d+ kg/.test(await eggRow.innerText()), 'eggs are counted, not weighed');

console.error('  [uat] 4. persistence across a reload');
/* ---------- 4. persistence across a reload ---------- */
await page.reload({ waitUntil: 'commit' });
await page.waitForSelector('#nav button', { timeout: 20000 });
await page.click('#nav button:has-text("Shop")');
await page.waitForTimeout(300);
const afterReload = await page.locator('.gitem, .wrow, .opt.on, .dtype.on').count();
ok(afterReload > 0, 'choices survive a reload');
await page.click('[data-step="1"]').catch(() => {});
await page.waitForTimeout(250);
if (await page.locator('.opt').count())
  ok(await page.locator('.opt.on').count() > 0,
     'the DISHES survive a reload. The legacy save() dropped state.pick entirely, so every choice reverted while the plan built from it stayed');

console.error('  [uat] 5. viewport, at the three widths that matter');
/* ---------- 5. viewport, at the three widths that matter ---------- */
for (const width of [320, 390, 430]) {
  await page.setViewportSize({ width, height: 844 });
  for (const tab of ['today', 'shop', 'plan', 'foods', 'weight', 'guide']) {
    await page.click(`#nav button[data-tab="${tab}"]`);
    await page.waitForTimeout(120);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(over <= 1, `${tab} does not scroll sideways at ${width} px (overflow ${over})`);
    const clipped = await page.evaluate(() => {
      const bad = [];
      for (const e of document.querySelectorAll('#main *, .hero *, #nav *'))
        if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX === 'visible'
            && e.children.length === 0 && e.textContent.trim()) bad.push(e.textContent.trim().slice(0, 30));
      return bad;
    });
    eq(clipped.length, 0, `${tab} clips no text at ${width} px: ${clipped.slice(0, 2).join(' | ')}`);
  }
}
await page.setViewportSize({ width: 390, height: 844 });

console.error('  [uat] 6. contrast on the header, measured not asserted');
/* ---------- 6. contrast on the header, measured not asserted ---------- */
const contrast = await page.evaluate(() => {
  const lum = c => { const v = c.map(x => x / 255).map(x => x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
    return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const rgb = s => s.match(/\d+/g).slice(0, 3).map(Number);
  const out = [];
  for (const b of document.querySelectorAll('#whoBar button')) {
    const cs = getComputedStyle(b);
    let bg = cs.backgroundColor, el = b;
    while (bg === 'rgba(0, 0, 0, 0)' && el.parentElement) { el = el.parentElement; bg = getComputedStyle(el).backgroundColor; }
    const [a, c] = [lum(rgb(cs.color)), lum(rgb(bg))];
    out.push({ on: b.className.includes('on'), ratio: (Math.max(a, c) + .05) / (Math.min(a, c) + .05) });
  }
  return out;
});
for (const c of contrast)
  ok(c.ratio >= 4.5, `person switcher, ${c.on ? 'selected' : 'unselected'}: ${c.ratio.toFixed(1)}:1 (WCAG AA needs 4.5)`);

/* Fix the class, not the instance. Section 14.4 names this exact failure: the
   duplicate dahi was fixed where it was pointed at and missed everywhere else.
   The person switcher was measured after a contrast bug; nothing else was. So
   this sweeps EVERY visible text node on EVERY tab. It caught the pan figure
   rendering green on green the first time it ran. */
for (const tab of ['today', 'shop', 'plan', 'foods', 'weight', 'guide']) {
  await page.click(`#nav button[data-tab="${tab}"]`);
  await page.waitForTimeout(180);
  const bad = await page.evaluate(() => {
    const lum = c => { const v = c.map(x => x / 255).map(x => x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
      return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
    const parse = s => { const m = s.match(/[\d.]+/g); if (!m) return null;
      const a = m.length > 3 ? Number(m[3]) : 1; return a < 0.95 ? null : m.slice(0, 3).map(Number); };
    const out = [];
    for (const e of document.querySelectorAll('#main *, .hero *, .nav *')) {
      const text = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
      if (!text) continue;
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.5) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const fg = parse(cs.color); if (!fg) continue;
      let bg = null, el = e;
      while (el && !bg) { const c = parse(getComputedStyle(el).backgroundColor); if (c) bg = c; el = el.parentElement; }
      if (!bg) bg = [251, 250, 247];
      const [a, b] = [lum(fg), lum(bg)];
      const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      /* The actual WCAG AA rule: 4.5:1 for body text, 3:1 only for large text,
         which means 24px, or 18.66px when bold. Applying 3:1 to everything
         would have let --ink-3 through at 2.77:1 on every source line and unit
         label in the app, which is where this started. */
      const px = parseFloat(cs.fontSize);
      const bold = Number(cs.fontWeight) >= 700 || cs.fontWeight === 'bold';
      const need = px >= 24 || (bold && px >= 18.66) ? 3 : 4.5;
      if (ratio < need) out.push({ text: text.slice(0, 34), ratio: Number(ratio.toFixed(2)),
                                   need, px, sel: e.tagName + '.' + [...e.classList].join('.') });
    }
    return out;
  });
  eq(bad.length, 0, `${tab}: every text element is readable against its background — ` +
    bad.slice(0, 4).map(b => `"${b.text}" ${b.ratio}:1 needs ${b.need} at ${b.px}px (${b.sel})`).join('; '));
}

console.error('  [uat] 7. swap, meal picker, and the Cronometer copy');
/* ---------- 7. swap, meal picker, and the Cronometer copy ---------- */
await page.click('#nav button[data-tab="today"]');
await page.waitForSelector('.meal');
await page.click('.swapbtn');
await page.waitForSelector('#sheet.on');
ok(await page.locator('.swapopt').count() > 3, 'the swap sheet offers alternatives');
const costs = await page.locator('.swapopt .so-d b').allTextContents();
ok(costs.some(t => /g P/.test(t)), 'and shows the protein cost of each before it is chosen');
await page.click('#sheetClose');
await page.waitForTimeout(120);
ok(!(await page.locator('#sheet.on').count()), 'the sheet closes');

await page.click('.pickbtn');
await page.waitForSelector('#sheet.on');
ok(await page.locator('.swapopt').count() >= 2, 'the meal picker offers other dishes for that slot');
await page.keyboard.press('Escape');
await page.waitForTimeout(120);

console.error('  [uat] 8. Foods, Plan and Weight');
/* ---------- 8. Foods, Plan and Weight ---------- */
await page.click('#nav button[data-tab="foods"]');
await page.waitForSelector('.frow');
eq(await page.locator('.frow').count(), 63, 'all 63 ingredients are listed with their sources');
await page.click('[data-foodfilter="verify"]');
await page.waitForTimeout(150);
eq(await page.locator('.frow').count(), 13, 'the VERIFY filter shows exactly the thirteen flagged values');
await page.click('[data-foodfilter="all"]');
await page.fill('#q', 'paneer');
await page.waitForTimeout(200);
ok(await page.locator('.frow').count() < 10, 'search narrows the list');

await page.click('#nav button[data-tab="plan"]');
await page.waitForSelector('.ktable');
const planText = await page.locator('#main').innerText();
ok(planText.includes('102'), 'the Plan tab says 102 days — the old one said "22 of 101", as a string literal');
ok(/1,?420/.test(planText) && /1,?800/.test(planText), 'and shows both intakes');
ok(planText.includes('estimated, not measured'), 'and leads with the uncomfortable truth about the metabolic rates');

await page.click('#nav button[data-tab="weight"]');
await page.waitForSelector('#wkg');
await page.fill('#wkg', '64.2');
await page.click('#wAdd');
await page.waitForTimeout(200);
ok((await page.locator('#main').innerText()).includes('64.2'), 'a weigh-in is logged');
await page.fill('#wkg', '999');
await page.click('#wAdd');
await page.waitForTimeout(150);
ok(!(await page.locator('#main').innerText()).includes('999'), 'and a nonsense weight is refused');

console.error('  [uat] 9. keyboard focus');
/* ---------- 9. keyboard focus ---------- */
await page.click('#nav button[data-tab="today"]');
await page.keyboard.press('Tab');
const focused = await page.evaluate(() => document.activeElement?.tagName);
ok(['BUTTON', 'A', 'INPUT'].includes(focused), `tab moves focus to something interactive (got ${focused})`);

console.error('  [uat] 10. the manifest is a real file');
/* ---------- 10. the manifest is a real file ---------- */
const mf = await page.request.get(URLBASE + 'manifest.webmanifest');
eq(mf.status(), 200, 'manifest.webmanifest is served as a real file, not a blob URL');
const mfj = await mf.json();
eq(mfj.display, 'standalone', 'and declares standalone display');
ok(mfj.icons?.[0]?.src?.endsWith('.png'), 'with a real PNG icon, not a data: URI');

console.error('  [uat] 11. touch targets');
/* ---------- 11. touch targets ---------- */
/* A phone on a wet worktop. 44 x 44 px is the floor; 124 of 130 controls were
   under it, including every day in the 102-day strip. */
await page.setViewportSize({ width: 390, height: 844 });
for (const tab of ['today', 'shop', 'foods', 'weight']) {
  await page.click(`#nav button[data-tab="${tab}"]`);
  await page.waitForTimeout(150);
  const small = await page.evaluate(() => {
    const bad = [];
    for (const b of document.querySelectorAll('#main button, .nav button, .hero button, .strip button')) {
      const r = b.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      /* WCAG 2.5.5 exempts a target that is inline in a sentence — a text link
         inside a paragraph cannot be 44 px tall without breaking the paragraph.
         Everything a thumb aims at deliberately is in scope. */
      if (b.classList.contains('linkbtn')) continue;
      if (r.height < 44) bad.push({ t: (b.textContent || '').trim().slice(0, 18), h: Math.round(r.height),
                                    c: b.className.split(' ')[0] || b.id || 'unclassed' });
    }
    return bad;
  });
  eq(small.length, 0, `${tab}: every control is at least 44 px tall — ` +
    small.slice(0, 4).map(b => `"${b.t}" ${b.h}px (.${b.c})`).join(', '));
}

console.error('  [uat] 12. it works with no connection');
/* ---------- 12. it works with no connection ---------- */
/* The app declared a manifest and standalone styling, so it looked installable.
   Added to a home screen with no signal it showed nothing at all — for an app
   read while cooking, that is the point of installing it. */
await page.goto(URLBASE, { waitUntil: 'commit' });
await page.waitForSelector('#nav button', { timeout: 20000 });

/* navigator.serviceWorker.ready never rejects — it just waits. Racing it is
   the difference between a failing test and a hanging one. */
const swReady = await page.evaluate(() => Promise.race([
  navigator.serviceWorker?.ready.then(r => Boolean(r.active)).catch(() => false) ?? false,
  new Promise(res => setTimeout(() => res(false), 8000)),
]));
ok(swReady, 'the service worker registers and activates');

/* A worker controls the page from the NEXT navigation, not the one that
   registered it. Without this reload the offline test is measuring an
   uncontrolled page and fails for the wrong reason. */
await page.reload({ waitUntil: 'commit' });
await page.waitForSelector('#nav button', { timeout: 20000 });
const controlling = await page.evaluate(() => Boolean(navigator.serviceWorker?.controller));
ok(controlling, 'and controls the page after one reload');
const shell = await page.evaluate(async () => {
  const names = await caches.keys();
  if (!names.length) return [];
  const c = await caches.open(names[0]);
  return (await c.keys()).map(r => new URL(r.url).pathname);
});
ok(shell.includes('/index.html'), `the app itself is cached for offline use (${shell.join(' ')})`);
ok(shell.includes('/icon.png'), 'so is the home-screen icon');

await ctx.setOffline(true);
try {
  /* 'commit' rather than 'load': offline, the Google Fonts <link> never
     resolves, and waiting for the load event would hang forever. The page is
     readable long before then — the fonts degrade to Georgia and a system
     sans, which is what the fallback stack is for. */
  await page.reload({ waitUntil: 'commit', timeout: 15000 });
  await page.waitForSelector('.meal', { timeout: 15000 });
  const offlineMeals = await page.locator('.meal').count();
  ok(offlineMeals === 3, `the whole day still loads with no connection (${offlineMeals} meals)`);
  ok(await page.locator('#nav button').count() === 6, 'and all six tabs are there offline');
  await page.click('#nav button[data-tab="foods"]');
  await page.waitForSelector('.frow', { timeout: 10000 });
  ok(await page.locator('.frow').count() === 63, 'including all 63 foods, which are inlined in the page');
} catch (e) {
  ok(false, `offline load failed: ${String(e).slice(0, 120)}`);
} finally {
  await ctx.setOffline(false);
  await page.goto(URLBASE, { waitUntil: 'commit' });
await page.waitForSelector('#nav button', { timeout: 20000 });
}

eq(errors.length, 0, `no runtime errors across the whole session:\n      ${errors.slice(0, 5).join('\n      ')}`);

clearTimeout(HARD_LIMIT);
await browser.close();
closeServer();

if (failures.length) {
  console.error(`\nuat: ${failures.length} FAILED, ${passed} passed\n`);
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}`));
  process.exit(1);
}
console.log(`uat: ${passed} assertions passed`);
