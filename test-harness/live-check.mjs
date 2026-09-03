/* Verify the DEPLOYED site, not the local build. A build passing on this laptop
   proves nothing about what Mrinal and Ramesh open. */
import { chromium } from 'playwright';
const URL = process.argv[2] || 'https://navcreates1.github.io/Mrinal-Rameshdiet/';
let pass = 0; const fail = [];
const ok = (c, m) => { if (c) pass++; else fail.push(m); };

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('dialog', d => d.accept());

const res = await p.goto(URL, { waitUntil: 'networkidle' });
ok(res.status() === 200, `the link loads (${res.status()})`);
ok(!p.url().includes('Plan.html'), `and serves the app directly, no redirect hop (${p.url()})`);
ok(errs.length === 0, `no runtime errors: ${errs.slice(0,2).join(' | ')}`);
ok(await p.locator('#nav button').count() === 6, 'six tabs');
ok(await p.locator('.meal').count() === 3, 'THREE meals, not five');
ok((await p.locator('.meal .mt b').allTextContents()).join(',') === 'Breakfast,Lunch,Dinner', 'breakfast, lunch, dinner');
ok(await p.locator('.miniring').count() === 2, 'a ring for each of them');

await p.click('#nav button:has-text("Shop")');
await p.waitForSelector('.steps', { timeout: 10000 });
ok(await p.locator('.dtype').count() === 21, 'THE SHOP TAB EXISTS, and every day offers Normal / Vegetarian / Eating out');
await p.click('.dayrow:nth-of-type(3) .dtype:has-text("Vegetarian")');
await p.waitForTimeout(300);
await p.click('.copybar button:has-text("Next")');
await p.waitForSelector('.opt');
ok(await p.locator('.opt.on').count() === 0, 'nothing is pre-selected');
ok(await p.locator('text=For the vegetarian days').count() > 0, 'and the vegetarian dishes are there');
for (const s of ['b','l','d']) await p.click(`.linkbtn[data-suggest="${s}"]`);
await p.click('.copybar button:has-text("Next")');
await p.waitForSelector('.vchip');
await p.click('.linkbtn:has-text("Pick the ones these meals need")');
await p.click('button:has-text("Build the week")');
await p.waitForTimeout(1200);
ok(await p.locator('#bErr').count() === 0, 'the week builds');
ok(await p.locator('.banner.ok:has-text("no meat, fish or eggs")').count() === 1, 'and the fasting-day check passes');
await p.click('.copybar button:has-text("Next")');
await p.waitForSelector('[data-have]');
await p.click('.copybar button:has-text("Next")');
await p.waitForSelector('.gitem');
ok(await p.locator('.gitem').count() > 5, `THE SHOPPING LIST IS REACHED — ${await p.locator('.gitem').count()} lines`);

const mf = await p.request.get(new global.URL('manifest.webmanifest', URL).href);
ok(mf.status() === 200, 'manifest.webmanifest is served');
const icon = await p.request.get(new global.URL('icon.png', URL).href);
ok(icon.status() === 200, 'the home-screen icon is served');
const old = await p.request.get(new global.URL('Plan.html', URL).href);
ok(old.status() === 200 && /url=\.\/">/.test(await old.text()), 'the old /Plan.html link now points at the new app');

/* The QA findings, checked against what is actually deployed. */
const sw = await p.request.get(new global.URL('sw.js', URL).href);
ok(sw.status() === 200, 'sw.js is served, so the app works offline once installed');
ok(/javascript/i.test(sw.headers()['content-type'] ?? ''),
   `and with a JavaScript MIME type (${sw.headers()['content-type']}) — a worker will not register otherwise`);

/* The clocks going back. 25 October appeared twice and 10 December was
   unreachable; both are visible in the date strip. */
const strip = await p.locator('.strip .chip').allInnerTexts();
ok(strip.length === 102, `the date strip holds 102 days (${strip.length})`);
ok(new Set(strip).size === 102, 'every one a different date — 25 Oct used to appear twice');
ok(strip[strip.length - 1] === '10 Dec', `and the last is 10 Dec (${strip[strip.length - 1]})`);
ok(strip.filter(d => d === '25 Oct').length === 1, 'the day the clocks go back appears once');

/* Recipe text agrees with the rows it sits under. */
const attaRow = await p.locator('.meal:has(.ing:has-text("Atta"))').first();
if (await attaRow.count()) {
  const grams = await attaRow.locator('.ing:has-text("Atta") .pcell.mm b').innerText();
  const method = (await attaRow.locator('.method').innerText());
  ok(method.includes(grams.trim()),
     `the roti instruction quotes the same weight as the row (${grams.trim()} in "${method.slice(0, 60)}")`);
}

await p.screenshot({ path: '/tmp/shots/LIVE-today.png' });
await b.close();
if (fail.length) { console.error(`live-check: ${fail.length} FAILED, ${pass} passed`); fail.forEach((f,i)=>console.error(`  ${i+1}. ${f}`)); process.exit(1); }
console.log(`live-check: ${pass} checks passed against ${URL}`);
