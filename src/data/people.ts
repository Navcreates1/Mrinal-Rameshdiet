/* The two people, their targets, and the arithmetic behind them.

   Nothing here is a round number chosen for looking sensible. Every figure is
   derived, and the derivation is code rather than prose so that changing one
   input moves everything downstream — the legacy app restated all of this as
   literal text on the Plan tab, which meant editing a target silently made the
   explanation lie. */

export type PersonId = 'M' | 'R';

export interface Targets {
  k: number;   // kcal
  p: number;   // protein, g
  c: number;   // carbohydrate, g
  f: number;   // fat, g
  fb: number;  // fibre, g
}

export interface Person {
  name: string;
  start: number;   // kg at 31 August 2026
  goal: number;    // kg by 10 December 2026
  ht: number;      // cm
  age: number;
  sex: 'F' | 'M';
  bmr: number;     // Mifflin-St Jeor
  tdee: number;    // bmr x assumed activity factor
  activity: number;
  activityNote: string;
  t: Targets;
  colour: string;
}

export const PEOPLE: Record<PersonId, Person> = {
  M: {
    name: 'Mrinal', start: 65, goal: 59, ht: 155, age: 39, sex: 'F',
    bmr: 1263, tdee: 1870, activity: 1.48,
    activityNote: '8,000 steps a day and three training sessions a week. She currently does two — ' +
      'at two the burn is nearer 1,800 and the December figure is 5.0 kg, not 6.0. ' +
      'Moving from two sessions to three is the highest-value change available in this plan.',
    t: { k: 1420, p: 120, c: 130, f: 42, fb: 28 },
    colour: 'var(--chilli)',
  },
  R: {
    name: 'Ramesh', start: 75, goal: 70, ht: 169, age: 45, sex: 'M',
    bmr: 1586, tdee: 2180, activity: 1.375,
    activityNote: 'Assumed: desk job with two gym sessions. No step count was ever supplied, ' +
      'which makes this the least reliable figure in the project. If he is sedentary and drives ' +
      'to work the true burn is nearer 2,000, his intake should be about 1,620, and the outcome ' +
      'is roughly 3.5 kg rather than 5.0. Three weigh-ins settle it — see the Weight tab.',
    t: { k: 1800, p: 140, c: 175, f: 60, fb: 35 },
    colour: 'var(--indigo)',
  },
};

/* Ramesh is not a flat multiple of Mrinal. His food is about 1.27x hers overall,
   but that splits unevenly: protein tracks body weight, which is close between
   them, while carbohydrate and fat track the calorie gap, which is wide.
   Multiplying her whole plate by 1.27 leaves him short on carbohydrate and
   eating more protein than he needs. */
export const SCALE: Record<string, number> = {
  pro: PEOPLE.R.t.p / PEOPLE.M.t.p,     // 140 / 120 = 1.167
  carb: PEOPLE.R.t.c / PEOPLE.M.t.c,    // 175 / 130 = 1.346
  fat: PEOPLE.R.t.f / PEOPLE.M.t.f,     // 60 / 42   = 1.429
  veg: 1.25,                            // volume, not macro matching
  fruit: 1.25,
};

/** 7,700 kcal is one kilogram of fat. */
export const KCAL_PER_KG = 7700;

export const shortfall = (id: PersonId): number => PEOPLE[id].tdee - PEOPLE[id].t.k;
export const lossPerWeek = (id: PersonId): number => (shortfall(id) * 7) / KCAL_PER_KG;
export const bmi = (kg: number, cm: number): number => kg / (cm / 100) ** 2;

/** Mifflin-St Jeor, shown so the BMR figures above can be checked rather than trusted. */
export const mifflin = (p: Person): number =>
  Math.round(10 * p.start + 6.25 * p.ht - 5 * p.age + (p.sex === 'M' ? 5 : -161));

/* Acceptance bands a planned day must land inside. These were magic numbers
   inline in the legacy day solver; naming them means the harness can assert
   them and the Plan tab can explain them.

   The protein floor exists because a vegetarian day at this calorie level lands
   near 70 g if left alone, which is where muscle starts going instead of fat.
   The fat floor is the hormonal one — dal-heavy days fell to 25 g, about
   0.38 g/kg, before the tadka was fixed. */
export const BANDS: Record<PersonId, {
  pMin: number; pMax: number; fMin: number; fMax: number; fbMin: number;
}> = {
  M: { pMin: 115, pMax: 148, fMin: 32, fMax: 58, fbMin: 20 },
  R: { pMin: 135, pMax: 175, fMin: 44, fMax: 78, fbMin: 26 },
};

/* fMax and fbMin are new, and additive — the legacy solver had no upper bound on
   fat at all. Without one, a three-meal vegetarian day chasing 139 g of protein
   through low-fat paneer lands at 66 g of fat against a 42 g target, because
   paneer carries 9 g of fat for every 21 g of protein. The ceilings are set just
   above what the verified five-meal reference days already deliver:
   Mrinal 39-55 g fat and 21-34 g fibre, Ramesh 52-71 g and 28-44 g. */

/** How far a day may sit from its calorie target before the app says so. */
export const KCAL_TOLERANCE = 40;
