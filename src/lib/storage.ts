/* Storage, degrading to memory.

   Two tiers now, not three: the browser's localStorage when this is hosted at a
   real URL, then memory. The third tier was Claude's artifact storage, which
   does not exist at a plain URL and was dead code the moment the file was
   published to GitHub Pages.

   WHAT CHANGED, AND WHY IT MATTERED
   The legacy save() stored weigh-ins, cupboard answers, prices and built week
   plans — but NOT the choices those plans were derived from. state.pick (which
   days, which dishes, which vegetables) and state.swaps were both dropped, so a
   reload silently reverted every selection while keeping the plan built from
   them. The vegetable substitutions in particular reverted on the shopping list
   without anyone being told. */

const KEY = 'mrinal-ramesh-plan:v2';
const LEGACY_KEY = 'plan:weights';
const PROBE = 'mrinal-ramesh-plan:probe';

export type Backend = 'local' | 'memory';

export interface Saved {
  w: { M: { d: number; kg: number }[]; R: { d: number; kg: number }[] };
  have: Record<string, boolean>;
  ticked: Record<string, boolean>;
  prices: Record<string, number>;
  plans: Record<number, unknown>;
  pick: Record<string, unknown>;
  swaps: Record<string, unknown>;
  prefs: Record<string, unknown>;
}

export const EMPTY: Saved = {
  w: { M: [], R: [] }, have: {}, ticked: {}, prices: {},
  plans: {}, pick: {}, swaps: {}, prefs: {},
};

let backend: Backend = 'memory';
let memory: string | null = null;

/** Whether anything typed on this device will still be here tomorrow.
    Surfaced on screen when it is false, rather than failing silently. */
export const canSave = (): boolean => backend === 'local';
export const backendName = (): Backend => backend;

function usable(): boolean {
  try {
    localStorage.setItem(PROBE, '1');
    localStorage.removeItem(PROBE);
    return true;
  } catch { return false; }   // Safari private mode, or storage disabled
}

export function save(data: Saved): void {
  const json = JSON.stringify(data);
  if (usable()) {
    try { localStorage.setItem(KEY, json); backend = 'local'; return; } catch { /* fall through */ }
  }
  backend = 'memory';
  memory = json;
}

export function load(): Saved {
  let raw: string | null = null;
  if (usable()) {
    backend = 'local';
    raw = localStorage.getItem(KEY);
    /* One-time carry-over from the version that shipped before the repository.
       Weigh-ins are the only thing worth rescuing — the meal plans were built
       against five slots and no longer mean the same thing. */
    if (raw === null) {
      const old = localStorage.getItem(LEGACY_KEY);
      if (old) {
        try {
          const p = JSON.parse(old) as Partial<Saved> & { M?: unknown; R?: unknown };
          const w = p.M ? { M: p.M, R: p.R } : p.w;
          return { ...EMPTY, ...(w ? { w: w as Saved['w'] } : {}),
                   have: p.have ?? {}, prices: p.prices ?? {} };
        } catch { /* unreadable, start clean */ }
      }
    }
  } else {
    backend = 'memory';
    raw = memory;
  }
  if (!raw) return { ...EMPTY };
  try {
    const p = JSON.parse(raw) as Partial<Saved>;
    return { ...EMPTY, ...p, w: p.w ?? { M: [], R: [] } };
  } catch { return { ...EMPTY }; }
}
