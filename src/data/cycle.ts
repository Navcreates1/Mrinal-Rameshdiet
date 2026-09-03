/* The two seven-day cycles, and the fixed plate.

   Rotating each slot independently by date let high-calorie meals stack by
   accident: measured across two weeks the daily total swung from 1,391 to
   1,578 kcal for Mrinal and 1,766 to 2,009 for Ramesh. On a plan built around
   hitting a number, that is noise rather than variety.

   These seven days were found by searching every combination of the five slots,
   scored on distance from both people's targets simultaneously, subject to
   three constraints: every day inside the protein and fat bands, a different
   main meal each day, and never two pulse-based mains in one day. */

export const CYCLE: Record<'nv' | 'v', string[][]> = {
  nv: [
    ['bnv1', 'mm2', 'lnv2', 'sn3', 'dnv1'],
    ['bnv1', 'mm1', 'lnv1', 'sn1', 'dnv3'],
    ['bnv1', 'mm1', 'lnv3', 'sn1', 'dnv2'],
    ['bhuel', 'mm1', 'lnv1', 'sn1', 'dnv1'],
    ['bnv1', 'mm1', 'lnv2', 'sn1', 'dnv3'],
    ['bnv1', 'mm1', 'lnv4', 'sn1', 'dnv2'],
    ['bnv1', 'mm1', 'lnv3', 'sn1', 'dnv1'],
  ],
  v: [
    ['bv2', 'mm1', 'lv1', 'sn1', 'dv3'],
    ['bv2', 'mm1', 'lv2', 'sn1', 'dv2'],
    ['bv2', 'mm1', 'lv4', 'sn1', 'dv6'],
    ['bhuel', 'mm1', 'lv6', 'sn1', 'dv1'],
    ['bv2', 'mm1', 'lv2', 'sn1', 'dv3'],
    ['bv2', 'mm1', 'lv1', 'sn1', 'dv2'],
    ['bv2', 'mm1', 'lv6', 'sn1', 'dv6'],
  ],
};

/** "Same every day" — an identical plate for the weeks when decisions are the
    thing that breaks adherence. It hides every swap control deliberately. */
export const FIXED: Record<'nv' | 'v', string[]> = {
  nv: ['bnv1', 'mm1', 'lnv1', 'sn1', 'dnv1'],
  v: ['bv1', 'mm1', 'lv1', 'sn1', 'dv1'],
};

/** Which dishes may fill each slot, by day type. */
export const ROT: Record<'nv' | 'v', Record<string, string[]>> = {
  nv: {
    b: ['bnv1', 'bnv2', 'bhuel'], mm: ['mm1', 'mm2'],
    l: ['lnv1', 'lnv2', 'lnv3', 'lnv4'], s: ['sn1', 'sn2', 'sn3'],
    d: ['dnv1', 'dnv2', 'dnv3'],
  },
  v: {
    b: ['bv1', 'bv2', 'bv3', 'bhuel'], mm: ['mm1', 'mm2'],
    l: ['lv1', 'lv2', 'lv3', 'lv4', 'lv5', 'lv6'], s: ['sn1', 'sn2', 'sn3'],
    d: ['dv1', 'dv2', 'dv3', 'dv4', 'dv5', 'dv6'],
  },
};
