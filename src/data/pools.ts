/* Swap pools, by slot type.

   Section 10.2 of the handover: lunch alone yields over 2,000 valid
   combinations, every one macro-accurate because it is computed from the food
   database rather than stored. */

import { F } from './foods.ts';
import type { SlotType } from './foods.ts';

export const POOL = {
  /* Fage appeared twice in the legacy non-vegetarian protein pool, so the swap
     sheet offered it as two identical options. One entry. */
  pro_nv: ['greek', 'sains', 'huelb', 'huelp', 'chicken', 'cod', 'salmon', 'prawns',
           'egg', 'white', 'paneerlf', 'tofu', 'soya', 'whey'],
  pro_v: ['greek', 'sains', 'whey', 'huelb', 'huelp', 'paneerlf', 'paneer', 'tofu',
          'soya', 'moong', 'toor', 'masoor', 'chanadal', 'rajma', 'chana', 'curd'],
  carb: ['rice', 'atta', 'oats', 'quinoa', 'poha'],
  veg: ['spinach', 'methi', 'amaranth', 'sarson', 'cauli', 'cabbage', 'okra', 'brinjal',
        'lauki', 'turai', 'ashgourd', 'snakegourd', 'karela', 'tinda', 'parwal', 'tindora',
        'gawar', 'beans', 'drumstick', 'carrot', 'capsicum', 'broccoli', 'cucumber',
        'tomato', 'onion', 'mooli', 'pumpkin'],
  fat: ['oil', 'ghee'],
  /* Fruit has its own pool. Without it the app offered to swap the blueberries
     in the yoghurt for mustard greens. */
  fruit: ['berries', 'apple', 'banana', 'orange', 'papaya'],
} as const;

export const poolFor = (type: SlotType, vegetarianDay: boolean): readonly string[] => {
  if (type === 'pro') return vegetarianDay ? POOL.pro_v : POOL.pro_nv;
  if (type === 'carb') return POOL.carb;
  if (type === 'veg') return POOL.veg;
  if (type === 'fruit') return POOL.fruit;
  if (type === 'fat') return POOL.fat;
  return [];   // fix — aromatics and sides are not swappable
};

export const LABEL: Record<SlotType, string> = {
  pro: 'Protein', carb: 'Carbohydrate', veg: 'Vegetable',
  fruit: 'Fruit', fat: 'Oil', fix: '',
};

/** Every pool entry must name a real food, and on a vegetarian day every
    protein option must itself be vegetarian. */
export function poolsAreSound(): string[] {
  const bad: string[] = [];
  for (const [name, ids] of Object.entries(POOL)) {
    const seen = new Set<string>();
    for (const id of ids) {
      if (!F[id]) bad.push(`${name} names a food that does not exist: ${id}`);
      if (seen.has(id)) bad.push(`${name} lists ${id} twice`);
      seen.add(id);
      if (name === 'pro_v' && F[id] && F[id].v !== 1) bad.push(`pro_v offers non-vegetarian ${id}`);
    }
  }
  return bad;
}
