/* Screenshots of the screens that matter, so a human can look rather than trust. */
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
const OUT = process.argv[2] || '/tmp/shots';
const { url: BASE, close: closeServer } = await serve(8796);
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
await p.goto(BASE,{waitUntil:'commit'}); await p.waitForSelector('#nav button');
const shot=async(name,full=true)=>{await p.waitForTimeout(350);await p.screenshot({path:`${OUT}/${name}.png`,fullPage:full});console.log(name);};

await shot('01-today');
await p.click('#nav button[data-tab="shop"]'); await shot('02-shop-days');
await p.click('.dayrow:nth-of-type(3) .dtype:text-is("Vegetarian")'); await p.waitForTimeout(200);
await shot('03-shop-days-veg');
await p.click('.copybar button:has-text("Next")'); await shot('04-shop-meals-empty');
for (const sl of ['b','l','d']) await p.click(`.linkbtn[data-suggest="${sl}"]`);
await shot('05-shop-meals-picked');
await p.click('.copybar button:has-text("Next")');
await p.click('.linkbtn:has-text("Pick the ones these meals need")'); await shot('06-shop-veg');
await p.click('button:has-text("Build the week")'); await p.waitForTimeout(500); await shot('07-shop-week');
await p.click('.copybar button:has-text("Next")'); await shot('08-shop-cupboard');
await p.click('.copybar button:has-text("Next")'); await shot('09-shop-list');
await p.click('#nav button[data-tab="plan"]'); await shot('10-plan');
await p.click('#nav button[data-tab="foods"]'); await shot('11-foods',false);
await p.click('#nav button[data-tab="weight"]'); await shot('12-weight');
await p.click('#nav button[data-tab="guide"]'); await shot('13-guide');
await p.click('#nav button[data-tab="today"]'); await p.waitForTimeout(200);
await p.click('.swapbtn'); await shot('14-swap',false);
await b.close(); closeServer();
