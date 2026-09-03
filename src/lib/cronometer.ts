/* Plain-text export for Cronometer.

   The division of labour is deliberate: Cronometer is the record, this app is
   the prescription. Both of them log there, so the app's job is to hand over a
   day in a form that can be typed in without re-deriving anything — and to
   carry the raw and dry markers across, because that is where the 200 kcal
   errors come from. */

import { F } from '../data/foods.ts';
import { M } from '../data/meals.ts';
import { PEOPLE } from '../data/people.ts';
import type { PersonId } from '../data/people.ts';
import { fmtLong, dayOf } from '../data/calendar.ts';
import type { DaySolution } from './portion.ts';

const amount = (fid: string, g: number): string => (F[fid]!.ml ? `${g} ml` : `${Math.round(g)} g`);

const mark = (fid: string): string => {
  const w = F[fid]!.w;
  return w ? ` (${w} weight)` : '';
};

export function dayText(dayIndex: number, who: PersonId, sol: DaySolution): string {
  const p = PEOPLE[who];
  const out: string[] = [
    `${p.name} — ${fmtLong(dayOf(dayIndex))}`,
    '',
  ];
  for (const meal of sol.meals) {
    out.push(M[meal.mid]!.t);
    for (const [fid, g] of meal.rows) out.push(`  ${amount(fid, g)} ${F[fid]!.n}${mark(fid)}`);
    out.push('');
  }
  const t = sol.total;
  out.push(
    `Total  ${Math.round(t.k)} kcal · ${t.p.toFixed(0)} g protein · ${t.c.toFixed(0)} g carbohydrate · ${t.f.toFixed(0)} g fat · ${t.fb.toFixed(0)} g fibre`,
    `Target ${p.t.k} kcal · ${p.t.p} g protein · ${p.t.c} g carbohydrate · ${p.t.f} g fat · ${p.t.fb} g fibre`,
    '',
    'Weights are RAW or DRY where marked — weigh before cooking, not after.',
    'Log the cooking oil separately; it is easy to miss and it is 40 kcal per 5 ml.',
  );
  return out.join('\n');
}

export function shopText(groups: { label: string; note: string; lines: string[] }[]): string {
  const out: string[] = ['Shopping list', ''];
  for (const g of groups) {
    if (!g.lines.length) continue;
    out.push(g.label.toUpperCase(), ...g.lines.map(l => `  ${l}`), '');
  }
  return out.join('\n');
}

/** Clipboard with a fallback. navigator.clipboard needs a secure context;
    over plain HTTP or in an odd webview it simply is not there. */
export async function copy(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through to the old way */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const done = document.execCommand('copy');
    document.body.removeChild(ta);
    return done;
  } catch { return false; }
}
