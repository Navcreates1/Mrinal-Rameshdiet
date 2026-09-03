/* GENERATED from test-harness/goldens.json by gen-data.mjs — then owned by hand.

   Quantities in `x` are Mrinal's REFERENCE portion: the weights the handover
   was verified against. They are the seed the portion solver scales from, not
   a fixed prescription — see src/lib/portion.ts.

   The tag on each ingredient drives the swap engine and the scaling:
     pro   protein     carb  carbohydrate   veg  vegetable
     fruit fruit       fat   oil            fix  aromatics and sides, not swappable */

import type { SlotType } from './foods.ts';

/** Where a dish sits in the day. `mm` and `s` are the optional "later" pair. */
export type MealSlot = 'b' | 'mm' | 'l' | 's' | 'd';

/** The three that make a day. Handover section 2: her pattern is three meals. */
export const CORE_SLOTS: MealSlot[] = ['b', 'l', 'd'];
/** Optional, off by default. Eating six times a day was never the ask. */
export const LATER_SLOTS: MealSlot[] = ['mm', 's'];

export interface Meal {
  t: string;                              // title
  v: 0 | 1;                               // safe on a vegetarian day
  ic: string;                             // sprite id
  slot: MealSlot;
  x: [string, number, SlotType][];        // [food id, Mrinal's reference grams, tag]
  m: string[];                            // method, one step per line
}

export const M: Record<string, Meal> = {
  bnv1: {
    t: 'Egg bhurji with roti', v: 0, ic: 'egg', slot: 'b',
    x: [['egg', 100, 'pro'], ['white', 70, 'fix'], ['spinach', 80, 'veg'], ['onion', 40, 'fix'], ['tomato', 60, 'fix'], ['oil', 5, 'fat'], ['atta', 30, 'carb']],
    m: [
      'Whisk the eggs and whites together with salt, turmeric and chilli powder.',
      'Heat the measured oil, soften the onion and tomato for 3 minutes.',
      'Add the spinach, wilt for 1 minute, then pour in the egg.',
      'Stir on a low heat until just set. Do not add more oil at this stage.',
      'Roll one roti from {atta} of atta and cook it dry on a hot tawa.',
    ],
  },
  bnv2: {
    t: 'Greek yoghurt, oats and berries', v: 0, ic: 'yoghurt', slot: 'b',
    x: [['greek', 140, 'pro'], ['whey', 12, 'fix'], ['oats', 38, 'carb'], ['almond', 10, 'fix'], ['berries', 80, 'fruit']],
    m: [
      'Weigh the yoghurt straight into the bowl.',
      'Stir the whey powder and dry oats through, then leave 5 minutes to soften, or soak overnight.',
      'Top with the berries and about eight almonds, counted out. No honey, no sugar.',
    ],
  },
  bv1: {
    t: 'Greek yoghurt, oats and berries', v: 1, ic: 'yoghurt', slot: 'b',
    x: [['greek', 140, 'pro'], ['whey', 12, 'fix'], ['oats', 38, 'carb'], ['almond', 10, 'fix'], ['berries', 80, 'fruit']],
    m: [
      'Weigh the yoghurt straight into the bowl.',
      'Stir the whey powder and dry oats through, then leave 5 minutes, or soak overnight.',
      'Top with the berries and about eight almonds, counted out. No honey, no sugar.',
    ],
  },
  bv2: {
    t: 'Paneer bhurji with roti', v: 1, ic: 'paneer', slot: 'b',
    x: [['paneerlf', 100, 'pro'], ['onion', 40, 'fix'], ['tomato', 60, 'fix'], ['capsicum', 60, 'veg'], ['oil', 5, 'fat'], ['atta', 25, 'carb']],
    m: [
      'Crumble the weighed paneer with your fingers.',
      'Heat the measured oil, soften onion, tomato and capsicum for 4 minutes.',
      'Add the paneer with turmeric, chilli and salt, cook 3 minutes.',
      'Roll one roti from {atta} of atta and cook it dry on a hot tawa.',
    ],
  },
  bv3: {
    t: 'Masala oats with soya', v: 1, ic: 'oats', slot: 'b',
    x: [['oats', 20, 'carb'], ['soya', 25, 'pro'], ['greek', 70, 'fix'], ['whey', 8, 'fix'], ['peas', 60, 'veg'], ['onion', 40, 'fix'], ['oil', 7.5, 'fat']],
    m: [
      'Soak the weighed soya chunks in boiling water 10 minutes, squeeze dry, chop.',
      'Heat the measured oil, fry the onion, add peas and soya.',
      'Add the oats and 200 ml water, season, simmer 5 minutes until thick.',
      'Serve the weighed Greek yoghurt on the side. It is what carries the protein here.',
    ],
  },
  bhuel: {
    t: 'Huel shake', v: 1, ic: 'whey', slot: 'b',
    x: [['huelb', 75, 'pro'], ['berries', 80, 'fruit']],
    m: [
      'Weigh the powder — do not eyeball the scoop. {huelb}, and a scoop is roughly 45 g.',
      'Shake with 400 ml cold water for 10 seconds and leave it 2 minutes to thicken.',
      'Berries on the side. This is the fastest breakfast in the plan and the one to reach for on a morning that has already gone wrong.',
      'Huel is vegan, so it works on the Ganesh and Dasara days too.',
    ],
  },
  mm1: {
    t: 'Whey shake', v: 1, ic: 'whey', slot: 'mm',
    x: [['whey', 25, 'pro']],
    m: [
      'Weigh {whey} of isolate — a scoop on most tubs is about 30 g.',
      'Shake with 250 ml cold water. Not milk: milk adds calories she has not budgeted.',
    ],
  },
  mm2: {
    t: 'Greek yoghurt and berries', v: 1, ic: 'yoghurt', slot: 'mm',
    x: [['greek', 100, 'pro'], ['whey', 8, 'fix'], ['berries', 60, 'fruit']],
    m: [
      'Weigh the yoghurt, stir the whey powder in until smooth, then the berries.',
      'The whey is there so this is a protein snack rather than a tub of yoghurt — it does the same job for a third of the cost and a fifth of the bulk.',
    ],
  },
  lnv1: {
    t: 'Lemon and pepper chicken, rice and broccoli', v: 0, ic: 'chicken', slot: 'l',
    x: [['chicken', 145, 'pro'], ['oil', 7.5, 'fat'], ['rice', 45, 'carb'], ['broccoli', 200, 'veg']],
    m: [
      'Weigh the chicken RAW. Rub with lemon juice, cracked black pepper and salt. Nothing else.',
      'Rinse the weighed rice and cook in 2 parts water. No butter, no oil in the rice.',
      'Steam the broccoli 5 minutes so it still has bite.',
      'Heat the measured oil and grill the chicken 5-6 minutes each side.',
    ],
  },
  lnv2: {
    t: 'Home chicken curry with rice', v: 0, ic: 'chicken', slot: 'l',
    x: [['chicken', 140, 'pro'], ['oil', 7.5, 'fat'], ['rice', 40, 'carb'], ['spinach', 150, 'veg'], ['onion', 50, 'fix'], ['tomato', 60, 'fix']],
    m: [
      'Weigh the chicken RAW and cut into pieces.',
      'Heat the measured {oil} of oil — no free pouring — and brown the onion.',
      'Add tomato, ginger, garlic and the usual masala, then the chicken.',
      'Add 150 ml water, cover, simmer 15 minutes. Stir the spinach through at the end.',
      'Cook the weighed rice separately.',
    ],
  },
  lnv3: {
    t: 'Grilled salmon, quinoa and beans', v: 0, ic: 'fish', slot: 'l',
    x: [['salmon', 95, 'pro'], ['quinoa', 58, 'carb'], ['beans', 200, 'veg'], ['oil', 7.5, 'fat']],
    m: [
      'Weigh the salmon RAW. Season with salt, pepper and lemon.',
      'Rinse and cook the weighed quinoa in 2 parts water for 15 minutes.',
      'Steam the beans, then toss with the measured oil and garlic.',
      'Grill the salmon 4 minutes a side. Salmon carries its own fat, which is why the oil stays at {oil}.',
    ],
  },
  lnv4: {
    t: 'Prawn masala with rice', v: 0, ic: 'prawn', slot: 'l',
    x: [['prawns', 165, 'pro'], ['oil', 7.5, 'fat'], ['rice', 55, 'carb'], ['okra', 180, 'veg'], ['onion', 50, 'fix'], ['tomato', 60, 'fix']],
    m: [
      'Weigh the prawns RAW and peeled.',
      'Heat the measured oil, fry onion and tomato with masala for 5 minutes.',
      'Add the okra, cook 6 minutes, then the prawns for the last 4 minutes only.',
      'Cook the weighed rice separately. Prawns are lean but low in protein per gram - hence the large portion.',
    ],
  },
  lv1: {
    t: 'Grilled paneer, rice and broccoli', v: 1, ic: 'paneer', slot: 'l',
    x: [['paneerlf', 100, 'pro'], ['oil', 7.5, 'fat'], ['rice', 35, 'carb'], ['broccoli', 200, 'veg']],
    m: [
      'Weigh the paneer and cut into thick fingers.',
      'Rub with salt, chilli, turmeric and a spoon of curd from the fridge.',
      'Rinse and cook the weighed rice plain.',
      'Steam the broccoli. Pan-grill the paneer in the measured oil, 3 minutes a side.',
    ],
  },
  lv2: {
    t: 'Palak paneer with rice', v: 1, ic: 'paneer', slot: 'l',
    x: [['paneerlf', 95, 'pro'], ['spinach', 250, 'veg'], ['oil', 7.5, 'fat'], ['rice', 32, 'carb'], ['onion', 40, 'fix'], ['tomato', 50, 'fix']],
    m: [
      'Blanch the weighed spinach 2 minutes then blend. {spinach} raw collapses to very little.',
      'Heat the measured oil, fry onion, tomato, ginger and garlic.',
      'Add the spinach puree and simmer 5 minutes. No cream, no butter.',
      'Fold in the weighed paneer at the end. Serve with the plain cooked rice.',
    ],
  },
  lv3: {
    t: 'Soya chunk curry with rice', v: 1, ic: 'soya', slot: 'l',
    x: [['soya', 45, 'pro'], ['greek', 70, 'fix'], ['whey', 8, 'fix'], ['oil', 10, 'fat'], ['rice', 20, 'carb'], ['capsicum', 150, 'veg'], ['onion', 50, 'fix'], ['tomato', 60, 'fix']],
    m: [
      'Weigh {soya} DRY soya. Soak in boiling water 10 minutes, then squeeze out every drop.',
      'Heat the measured oil, brown the onion, add tomato and masala.',
      'Add capsicum and the squeezed soya, splash in 150 ml water, simmer 10 minutes.',
      'Cook the weighed rice separately. The yoghurt with whey stirred through is not optional - it is part of the protein.',
    ],
  },
  lv4: {
    t: 'Rajma with rice and curd', v: 1, ic: 'dal', slot: 'l',
    x: [['rajma', 50, 'pro'], ['greek', 90, 'fix'], ['whey', 10, 'fix'], ['oil', 7.5, 'fat'], ['rice', 18, 'carb'], ['spinach', 150, 'veg'], ['onion', 50, 'fix'], ['tomato', 60, 'fix']],
    m: [
      'Weigh {rajma} DRY rajma, soak overnight, pressure-cook 5 whistles.',
      'Heat the measured oil, make the onion-tomato base with ginger and garlic.',
      'Add the cooked rajma with its water and simmer 10 minutes.',
      'Wilt the spinach in at the end. Small rice portion here because rajma is already high in carbohydrate.',
      'The yoghurt and the scoop of whey stirred into it carry roughly half the protein of this meal. Do not skip either.',
    ],
  },
  lv5: {
    t: 'Chana masala with roti and curd', v: 1, ic: 'dal', slot: 'l',
    x: [['chana', 50, 'pro'], ['greek', 100, 'fix'], ['whey', 12, 'fix'], ['oil', 7.5, 'fat'], ['atta', 25, 'carb'], ['tomato', 100, 'veg'], ['onion', 50, 'fix']],
    m: [
      'Weigh {chana} DRY chickpeas, soak overnight, pressure-cook 6 whistles.',
      'Heat the measured oil, brown the onion, add tomato and chana masala.',
      'Add the chickpeas and simmer 10 minutes until thick.',
      'One roti from {atta} of atta, cooked dry. Yoghurt on the side.',
    ],
  },
  lv6: {
    t: 'Tofu bhurji with roti', v: 1, ic: 'tofu', slot: 'l',
    x: [['tofu', 220, 'pro'], ['greek', 80, 'fix'], ['whey', 10, 'fix'], ['oil', 7.5, 'fat'], ['atta', 25, 'carb'], ['capsicum', 120, 'veg'], ['onion', 40, 'fix'], ['tomato', 60, 'fix']],
    m: [
      'Press the weighed tofu between two plates 10 minutes, then crumble.',
      'Heat the measured oil, soften onion, tomato and capsicum.',
      'Add the tofu with turmeric, chilli and salt. Cook 5 minutes. Season harder than feels right - tofu needs it.',
      'One roti from {atta} of atta. Yoghurt on the side.',
    ],
  },
  sn1: {
    t: 'Raita with almonds', v: 1, ic: 'yoghurt', slot: 's',
    x: [['greek', 110, 'pro'], ['almond', 10, 'fix'], ['cucumber', 100, 'veg']],
    m: [
      'Use Fage, not plain dahi. Same bowl, three times the protein.',
      'Loosen it with a spoon of water if it is too thick, then salt, roasted cumin and the cucumber.',
      'Count the almonds out — about eight. They are 58 kcal, which is why they are counted and not grabbed by the handful.',
    ],
  },
  sn2: {
    t: 'Greek yoghurt, apple and almonds', v: 1, ic: 'yoghurt', slot: 's',
    x: [['greek', 85, 'pro'], ['whey', 8, 'fix'], ['almond', 10, 'fix'], ['apple', 180, 'fruit']],
    m: [
      'Weigh the yoghurt. Slice the apple in. Cinnamon if she wants it.',
    ],
  },
  sn3: {
    t: 'Whey shake and almonds', v: 1, ic: 'whey', slot: 's',
    x: [['whey', 22, 'pro'], ['almond', 10, 'fix']],
    m: [
      '{whey} isolate in 250 ml cold water. Take it within an hour of training.',
      'About eight almonds alongside — counted, not a handful.',
    ],
  },
  dnv1: {
    t: 'Baked cod with lauki and roti', v: 0, ic: 'fish', slot: 'd',
    x: [['cod', 140, 'pro'], ['oil', 7.5, 'fat'], ['lauki', 220, 'veg'], ['atta', 50, 'carb']],
    m: [
      'Weigh the cod RAW. Season with salt, pepper, lemon and a pinch of chilli.',
      'Bake at 200 C for 12 minutes. No batter, no breadcrumb coating.',
      'Peel and dice the lauki, cook in the measured oil with cumin and turmeric, lid on, 10 minutes.',
      'One roti from {atta} of atta, cooked dry.',
    ],
  },
  dnv2: {
    t: 'Tandoori chicken with salad', v: 0, ic: 'chicken', slot: 'd',
    x: [['chicken', 140, 'pro'], ['greek', 60, 'fix'], ['oil', 5, 'fat'], ['cucumber', 150, 'veg'], ['tomato', 100, 'fix'], ['onion', 40, 'fix'], ['atta', 35, 'carb']],
    m: [
      'Weigh the chicken RAW. Marinate 30 minutes in the yoghurt with ginger, garlic, chilli and garam masala. Use the Fage from the fridge — no separate tub of dahi.',
      'Grill or air-fry at 200 C for 18 minutes, turning once.',
      'Brush with the measured oil only at the end, never before.',
      'Slice the salad raw with lemon and salt. One roti from {atta} of atta.',
    ],
  },
  dnv3: {
    t: 'Fish curry with cauliflower', v: 0, ic: 'fish', slot: 'd',
    x: [['cod', 140, 'pro'], ['oil', 7.5, 'fat'], ['cauli', 200, 'veg'], ['atta', 46, 'carb'], ['onion', 40, 'fix'], ['tomato', 60, 'fix']],
    m: [
      'Weigh the cod RAW and cut into large pieces.',
      'Heat the measured oil, make the base with mustard seeds, curry leaves, onion and tomato.',
      'Add the cauliflower and 150 ml water, cook 8 minutes.',
      'Slide the fish in for the last 6 minutes. Do not stir hard or it breaks. One roti from {atta} of atta.',
    ],
  },
  dv1: {
    t: 'Moong dal, karela and roti', v: 1, ic: 'dal', slot: 'd',
    x: [['moong', 50, 'pro'], ['greek', 90, 'fix'], ['whey', 10, 'fix'], ['oil', 10, 'fat'], ['karela', 150, 'veg'], ['atta', 25, 'carb'], ['tomato', 60, 'fix']],
    m: [
      'Weigh {moong} DRY moong dal. Rinse and pressure-cook with turmeric, 3 whistles.',
      'Slice the karela thin, salt it, rest 10 minutes, then squeeze out the bitter water.',
      'Heat the measured oil, temper cumin and garlic, fry the karela 8 minutes.',
      'Pour the tempering over the dal. One roti from {atta} of atta, yoghurt on the side.',
    ],
  },
  dv2: {
    t: 'Paneer tikka with salad', v: 1, ic: 'paneer', slot: 'd',
    x: [['paneerlf', 95, 'pro'], ['greek', 50, 'fix'], ['oil', 5, 'fat'], ['capsicum', 120, 'veg'], ['onion', 50, 'fix'], ['cucumber', 100, 'fix'], ['atta', 34, 'carb']],
    m: [
      'Weigh the paneer, cube it, marinate 20 minutes in the yoghurt with tikka masala. Same tub as breakfast.',
      'Thread with capsicum and onion, grill or air-fry 12 minutes at 200 C.',
      'Brush the measured oil on at the end, not before.',
      'Raw cucumber on the side with lemon. One roti from {atta} of atta.',
    ],
  },
  dv3: {
    t: 'Soya keema with roti', v: 1, ic: 'soya', slot: 'd',
    x: [['soya', 40, 'pro'], ['oil', 10, 'fat'], ['peas', 80, 'veg'], ['atta', 30, 'carb'], ['onion', 50, 'fix'], ['tomato', 60, 'fix']],
    m: [
      'Weigh {soya} DRY soya granules, soak 8 minutes in boiling water, squeeze dry.',
      'Heat the measured oil, brown the onion, add ginger, garlic, tomato and masala.',
      'Add the soya and peas, splash of water, cook 10 minutes until dry.',
      'One roti from {atta} of atta.',
    ],
  },
  dv4: {
    t: 'Masoor dal with gobi and roti', v: 1, ic: 'dal', slot: 'd',
    x: [['masoor', 50, 'pro'], ['greek', 90, 'fix'], ['whey', 10, 'fix'], ['oil', 10, 'fat'], ['cauli', 200, 'veg'], ['atta', 25, 'carb'], ['tomato', 60, 'fix']],
    m: [
      'Weigh {masoor} DRY masoor dal, rinse, cook with turmeric until soft.',
      'Heat the measured oil, temper cumin, garlic and dried chilli.',
      'Add the cauliflower florets, cover, cook 10 minutes without extra oil.',
      'Pour half the tempering into the dal. One roti from {atta} of atta, yoghurt on the side.',
    ],
  },
  dv5: {
    t: 'Chana dal with methi and roti', v: 1, ic: 'dal', slot: 'd',
    x: [['chanadal', 45, 'pro'], ['greek', 90, 'fix'], ['whey', 10, 'fix'], ['oil', 10, 'fat'], ['methi', 120, 'veg'], ['atta', 25, 'carb'], ['onion', 40, 'fix']],
    m: [
      'Weigh {chanadal} DRY chana dal, soak 30 minutes, pressure-cook 4 whistles.',
      'Wash the methi leaves well, chop, and wilt them in the measured oil with garlic.',
      'Combine, season, simmer 5 minutes.',
      'One roti from {atta} of atta, yoghurt on the side.',
    ],
  },
  dv6: {
    t: 'Grilled tofu with mixed sabzi', v: 1, ic: 'tofu', slot: 'd',
    x: [['tofu', 250, 'pro'], ['greek', 60, 'fix'], ['whey', 5, 'fix'], ['oil', 5, 'fat'], ['beans', 200, 'veg'], ['atta', 25, 'carb'], ['onion', 40, 'fix']],
    m: [
      'Press the weighed tofu 15 minutes, cut into slabs, season hard.',
      'Pan-grill in the measured oil, 4 minutes a side, until the edges colour.',
      'Cook the beans with cumin, garlic and a splash of water, lid on, 8 minutes.',
      'One roti from {atta} of atta, yoghurt on the side.',
    ],
  },
};

export const MEAL_IDS = Object.keys(M);

/** Dishes built on a pulse. Never two of these in one day — it overloads carbohydrate. */
export const PULSE = ['moong', 'toor', 'masoor', 'chanadal', 'rajma', 'chana', 'soya'];
export const isPulse = (id: string): boolean =>
  M[id]!.x.some(([f, , t]) => t === 'pro' && PULSE.includes(f));
