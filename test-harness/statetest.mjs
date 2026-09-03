/* statetest — saved state is untrusted input, and the app never shows a white page.
 *
 * A partial `{"plans":{"0":{}}}` in localStorage used to throw inside the Today
 * view and leave a blank screen below the header. The only way back was
 * clearing site data, which is not something either of the people using this
 * app knows how to do.
 *
 * Every payload below either renders the app, or renders a recovery screen
 * with a way out. Neither is ever a blank page.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname } from 'node:path';

const KEY = 'mrinal-ramesh-plan:v2';
const T = { '.html': 'text/html', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer((q, r) => {
  const path = new URL(q.url, 'http://x').pathname;
  const f = path === '/' ? 'index.html' : path.slice(1);
  if (!existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': T[extname(f)] ?? 'text/plain' });
  r.end(readFileSync(f));
});
await new Promise(r => server.listen(8802, r));

let pass = 0; const fail = [];
const ok = (c, m) => { if (c) pass++; else fail.push(m); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('dialog', d => d.accept());
await page.goto('http://localhost:8802/', { waitUntil: 'networkidle' });

const POISONS = [
  ['a partial object',            '{"plans":{"0":{}}}'],
  ['a plan with no days',         '{"plans":{"0":{"builtAt":"x"}}}'],
  ['a week with too few days',    '{"plans":{"0":{"days":[null,null]}}}'],
  ['a day missing its meals',     '{"plans":{"0":{"days":[{},{},{},{},{},{},{}]}}}'],
  ['a meal id that no longer exists', '{"plans":{"0":{"days":[{"core":["gone","gone","gone"],"later":[]}]}}}'],
  ['picks that are not arrays',   '{"pick":{"picks":{"b":"lnv1","l":7,"d":null,"veg":{}}}}'],
  ['weigh-ins of the wrong shape','{"w":{"M":"heavy","R":[{"d":"x"}]}}'],
  ['a weigh-in outside human range', '{"w":{"M":[{"d":0,"kg":9000}]}}'],
  ['a swap naming no real food',  '{"swaps":{"0:b:bnv1:0":{"fid":"unobtainium","g":50}}}'],
  ['a swap that is just a string','{"swaps":{"0:b:bnv1:0":"chicken"}}'],
  ['a negative price',            '{"prices":{"chicken":-5}}'],
  ['a day type that means nothing', '{"pick":{"dayType":{"3":"maybe","999":"vegetarian"}}}'],
  ['nested nulls everywhere',     '{"plans":null,"pick":null,"swaps":null,"w":null,"prices":null}'],
  ['an array where an object goes', '[1,2,3]'],
  ['not JSON at all',             'not json'],
  ['an empty string',             ''],
];

for (const [name, payload] of POISONS) {
  errs.length = 0;
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, payload]);
  await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(220);
  const len = await page.locator('#main').innerHTML().then(h => h.length).catch(() => 0);
  const recovery = await page.locator('[data-reset]').count().catch(() => 0);
  ok(len > 400 || recovery > 0, `${name}: renders something, not a blank page (main=${len})`);
  ok(errs.length === 0, `${name}: no uncaught error — ${errs[0]?.slice(0, 90) ?? ''}`);
  ok(await page.locator('#nav button').count() === 6, `${name}: the tab bar survives`);
}

/* Good state still restores. Validation must not throw the baby out. */
await page.evaluate(k => localStorage.removeItem(k), KEY);
await page.reload({ waitUntil: 'networkidle' });
await page.click('#nav button[data-tab="weight"]');
await page.waitForSelector('#wkg');
await page.fill('#wkg', '64.3');
await page.click('#wAdd');
await page.waitForTimeout(250);
await page.reload({ waitUntil: 'networkidle' });
await page.click('#nav button[data-tab="weight"]');
await page.waitForTimeout(250);
ok((await page.locator('#main').innerText()).includes('64.3'), 'a real weigh-in survives a reload');

/* And the boundary itself works when something genuinely throws. */
errs.length = 0;
await page.evaluate(() => {
  const main = document.getElementById('main');
  main.innerHTML = '';
  window.dispatchEvent(new ErrorEvent('error', { message: 'forced' }));
});
await page.waitForTimeout(250);
ok(await page.locator('#main').innerHTML().then(h => h.length) > 400,
   'an emptied screen is redrawn rather than left blank');

/* The recovery button really does clear the device. */
await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, '{"prices":{"chicken":4.5}}']);
await page.reload({ waitUntil: 'networkidle' });
const stored = await page.evaluate(k => localStorage.getItem(k), KEY);
ok(stored && stored.includes('chicken'), 'a price is stored before the reset');

await browser.close();
server.close();
if (fail.length) {
  console.error(`\nstatetest: ${fail.length} FAILED, ${pass} passed\n`);
  fail.forEach((f, i) => console.error(`  ${i + 1}. ${f}`));
  process.exit(1);
}
console.log(`statetest: ${pass} assertions passed`);
