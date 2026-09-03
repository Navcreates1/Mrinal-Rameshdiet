/* GENERATED from test-harness/goldens.json by gen-data.mjs — then owned by hand.
   Every value is per 100 g, except items carrying `ml: 1` which are per 100 ml.

   src   composition source. USDA FoodData Central, IFCT 2017 (ICMR-NIN, via
         sources citing it — the PDF is not machine-readable), UK CoFID, or a
         manufacturer label.
   weak  the VERIFY flag: aggregator-sourced or the sources disagree. Thirteen
         of the sixty-three. Shown on screen, never silently smoothed over.
   cost  £ per kilogram, and ONLY where a real price was found. Seven of them.
         Nothing here is estimated — see handover section 13 for why that rule
         exists. An absent cost means the app shows "add", not a guess.
   w/cv  must be weighed raw or dry; cv is what it becomes cooked. Getting this
         backwards is a ~200 kcal daily error, which is the entire deficit. */

export type SlotType = 'pro' | 'carb' | 'veg' | 'fruit' | 'fat' | 'fix';

export interface Unit {
  g: number;      // grams in one of them
  s: string;      // singular noun
  p: string;      // plural noun
  box?: number[]; // box sizes it is sold in, largest first
}

export interface Food {
  n: string; s: string;
  k: number; p: number; c: number; f: number; fb: number;
  v: 0 | 1;              // allowed on a vegetarian day
  i: string;             // sprite id
  w?: 'raw' | 'dry';     // weigh it in this state
  cv?: number;           // multiply raw/dry weight by this to get cooked
  ml?: 1;                // measured in millilitres, not grams
  shop?: 'indian';       // cheaper at the Indian grocer
  fresh?: 1;             // buy on the midweek top-up, not Monday
  frozenok?: 1;
  unit?: Unit;           // sold by the item — nobody buys eggs by the kilogram
  packs?: number[];      // real shelf sizes, largest first
  pack?: number;         // sold in exactly one size
  cost?: number;         // £/kg — researched only, never estimated
  psrc?: string;         // the listing that price came from
  src: string;
  weak?: 1;              // VERIFY
  srcd?: 1;
}

export const F: Record<string, Food> = {
  chicken: { n: 'Chicken breast, skinless', s: 'Skinless breast fillet', k: 106, p: 22.5, c: 0, f: 2.6, fb: 0, v: 0, i: 'chicken', w: 'raw', cv: 0.75, fresh: 1, packs: [1600, 1000, 650, 320], cost: 6.5, psrc: 'Tesco 1.6 kg pack £10.65, £9.50 Clubcard — £5.94–6.66/kg. Smaller packs run £7.85–8.20/kg', src: 'USDA FDC 2646170' },
  cod: { n: 'Cod fillet', s: 'Skinless loin or fillet', k: 82, p: 17.8, c: 0, f: 0.7, fb: 0, v: 0, i: 'fish', w: 'raw', cv: 0.78, frozenok: 1, packs: [480, 260], src: 'USDA FDC' },
  salmon: { n: 'Salmon fillet', s: 'Skinless fillet', k: 131, p: 25.4, c: 0, f: 4.3, fb: 0, v: 0, i: 'fish', w: 'raw', cv: 0.78, frozenok: 1, packs: [480, 240], src: 'USDA FDC' },
  prawns: { n: 'Prawns, peeled', s: 'Peeled and deveined, tails off', k: 71, p: 13.6, c: 0.9, f: 1, fb: 0, v: 0, i: 'prawn', w: 'raw', cv: 0.75, frozenok: 1, packs: [400, 200], src: 'USDA FDC' },
  egg: { n: 'Whole egg', s: 'about 2 medium = 100 g', k: 143, p: 12.5, c: 0.7, f: 9.5, fb: 0, v: 0, i: 'egg', unit: { g: 50, s: 'egg', p: 'eggs', box: [15, 12, 10, 6] }, src: 'USDA FDC' },
  white: { n: 'Egg white', s: 'about 3 whites = 100 g', k: 52, p: 11, c: 0.7, f: 0.2, fb: 0, v: 0, i: 'egg', packs: [1000, 500], src: 'USDA FDC' },
  paneerlf: { n: 'Paneer, low-fat', s: 'shop-bought low-fat block', k: 180, p: 21, c: 4, f: 9, fb: 0, v: 1, i: 'paneer', shop: 'indian', packs: [450, 200], cost: 8.85, psrc: 'Sainsbury\'s Paneer 200 g, £1.77 (Trolley). That is standard paneer — low-fat may differ', src: 'Brand label — VERIFY yours' },
  paneer: { n: 'Paneer, full-fat', s: 'Amul / Mother Dairy', k: 296, p: 20, c: 3.5, f: 23, fb: 0, v: 1, i: 'paneer', shop: 'indian', src: 'Amul label 296 / Mother Dairy 321' },
  greek: { n: 'Fage Total 0%', s: 'or Sainsbury\'s Fat Free High Protein — cheaper and 11.5 g protein', k: 54, p: 10.3, c: 3, f: 0, fb: 0, v: 1, i: 'yoghurt', packs: [950, 450, 150], cost: 6.45, psrc: 'Fage Total 0% 950 g, £5.90–£6.35 across Morrisons, Sainsbury\'s and Tesco (Trolley)', src: 'Fage UK label. Best protein density of 10 yoghurts tracked: 20 g protein per 100 kcal' },
  sains: { n: 'Sainsbury\'s Fat Free High Protein', s: '450 g pot, about £1.65 — 52 g protein a pot', k: 59, p: 11.5, c: 4, f: 0.1, fb: 0, v: 1, i: 'yoghurt', packs: [450, 150], cost: 3.67, psrc: 'Sainsbury\'s Fat Free High Protein 450 g, £1.65 — 11.5 g protein per 100 g', src: 'Sainsbury\'s label via UK review round-up', srcd: 1 },
  curd: { n: 'Curd / dahi, plain', s: 'ONLY 3.4 g protein — a third of Fage. Use for marinades, not protein', k: 61, p: 3.4, c: 4, f: 3, fb: 0, v: 1, i: 'yoghurt', shop: 'indian', pack: 400, src: 'USDA / IFCT 2017' },
  whey: { n: 'Whey protein isolate', s: '1 scoop is about 30 g', k: 370, p: 90, c: 2, f: 0.5, fb: 0, v: 1, i: 'whey', packs: [2270, 900], src: 'Product label — check yours' },
  tofu: { n: 'Tofu, firm', s: 'drained weight', k: 72, p: 8, c: 2, f: 4.8, fb: 0.3, v: 1, i: 'tofu', fresh: 1, packs: [400, 280], src: 'USDA / IFCT 2017' },
  soya: { n: 'Soya chunks', s: 'Nutrela-type chunks, before soaking', k: 345, p: 52, c: 33, f: 0.5, fb: 13, v: 1, i: 'soya', w: 'dry', cv: 3, shop: 'indian', packs: [500, 200], src: 'Brand label / Plantigo' },
  moong: { n: 'Moong dal', s: 'Split yellow moong, uncooked', k: 347, p: 24, c: 59, f: 1.2, fb: 16, v: 1, i: 'dal', w: 'dry', cv: 2.6, shop: 'indian', packs: [2000, 1000, 500], src: 'IFCT 2017 (secondary)' },
  toor: { n: 'Toor / arhar dal', s: 'Split pigeon pea, uncooked', k: 331, p: 22.3, c: 63, f: 1.5, fb: 15, v: 1, i: 'dal', w: 'dry', cv: 2.6, shop: 'indian', packs: [2000, 1000, 500], src: 'IFCT 2017 (secondary)' },
  masoor: { n: 'Masoor dal', s: 'Red lentils, uncooked', k: 346, p: 24.2, c: 59, f: 1.3, fb: 11, v: 1, i: 'dal', w: 'dry', cv: 2.6, shop: 'indian', packs: [2000, 1000, 500], src: 'IFCT 2017 — sources give 24.2 and 25.4 g', weak: 1 },
  chanadal: { n: 'Chana dal', s: 'Split bengal gram, uncooked', k: 360, p: 20, c: 60, f: 5, fb: 17, v: 1, i: 'dal', w: 'dry', cv: 2.6, shop: 'indian', packs: [2000, 1000, 500], src: 'IFCT 2017 — sources give 20 and 25.2 g', weak: 1 },
  rajma: { n: 'Rajma (kidney beans)', s: 'Uncooked, soak overnight', k: 340, p: 22.9, c: 60, f: 1.5, fb: 15.2, v: 1, i: 'dal', w: 'dry', cv: 2.4, shop: 'indian', packs: [1000, 500], src: 'IFCT 2017 (secondary)' },
  chana: { n: 'Kabuli chana (chickpeas)', s: 'Uncooked, soak overnight', k: 378, p: 19.5, c: 63, f: 6, fb: 12, v: 1, i: 'dal', w: 'dry', cv: 2.4, shop: 'indian', packs: [1000, 500], src: 'USDA FDC / IFCT 2017' },
  huelb: { n: 'Huel Black Edition', s: '1 scoop is about 45 g — powder weight, before water', k: 444, p: 44.4, c: 24.4, f: 19.4, fb: 9.3, v: 1, i: 'whey', packs: [1500], src: 'Derived from Huel\'s 90 g serving: 400 kcal, 40 g protein, 17.5 g fat, 8.4 g fibre. Carbohydrate varies 19–25 g by flavour — check the pouch', weak: 1 },
  huelp: { n: 'Huel Powder v3.1', s: '2 scoops is about 100 g — powder weight', k: 400, p: 30, c: 46, f: 13, fb: 7, v: 1, i: 'whey', src: 'Huel label. Lower protein and higher carbohydrate than Black' },
  rice: { n: 'Basmati rice', s: 'Uncooked grains, straight from the packet', k: 358, p: 7.5, c: 77, f: 0.9, fb: 1.4, v: 1, i: 'rice', w: 'dry', cv: 2.8, shop: 'indian', packs: [10000, 5000, 2000, 1000], cost: 1.95, psrc: 'Laila Basmati 5 kg, £8.00–£11.50 across Co-op, Morrisons and Asda (Trolley)', src: 'USDA FDC' },
  atta: { n: 'Atta (wholemeal flour)', s: 'Plain wholemeal chapati flour', k: 339, p: 13.7, c: 72.6, f: 1.87, fb: 12.2, v: 1, i: 'roti', w: 'dry', cv: 0, shop: 'indian', packs: [10000, 5000, 1500], cost: 0.95, psrc: 'Tesco wholemeal chapatti flour 10 kg £7.50; Elephant Atta 10 kg £10.50–£12.50 (Trolley)', src: 'USDA FDC' },
  oats: { n: 'Rolled oats', s: 'Plain rolled oats, not instant sachets', k: 379, p: 13.15, c: 67.7, f: 6.52, fb: 10.1, v: 1, i: 'oats', w: 'dry', cv: 3, packs: [1500, 1000, 500], cost: 1.2, psrc: 'Porridge oats 1 kg: Aldi £0.85, Waitrose £1.25, Sainsbury\'s £1.35 (Trolley)', src: 'USDA FDC' },
  quinoa: { n: 'Quinoa', s: 'Uncooked, rinse it first', k: 368, p: 14.1, c: 64.2, f: 6.07, fb: 7, v: 1, i: 'rice', w: 'dry', cv: 3, packs: [500, 300], src: 'USDA FDC 168874' },
  poha: { n: 'Poha (flattened rice)', s: 'Thick variety, before rinsing', k: 340, p: 6.5, c: 78, f: 1, fb: 2.5, v: 1, i: 'rice', w: 'dry', cv: 2.5, shop: 'indian', src: 'Aggregator — WEAK, verify', weak: 1 },
  spinach: { n: 'Spinach / palak', s: 'raw; 300 g raw cooks to 100 g', k: 23, p: 2.9, c: 3.6, f: 0.4, fb: 2.2, v: 1, i: 'greens', fresh: 1, packs: [500, 260, 200], src: 'IFCT / USDA' },
  methi: { n: 'Methi (fenugreek) leaves', s: 'raw', k: 49, p: 4.4, c: 6, f: 0.9, fb: 4.8, v: 1, i: 'greens', shop: 'indian', fresh: 1, src: 'IFCT 2017 (secondary)' },
  amaranth: { n: 'Amaranth / thotakura', s: 'raw', k: 33, p: 3.9, c: 4, f: 0.5, fb: 2.2, v: 1, i: 'greens', shop: 'indian', fresh: 1, src: 'IFCT 33 kcal vs USDA 23 kcal', weak: 1 },
  sarson: { n: 'Mustard greens / sarson', s: 'raw', k: 27, p: 2.9, c: 4.7, f: 0.4, fb: 3.2, v: 1, i: 'greens', fresh: 1, src: 'USDA FDC' },
  cauli: { n: 'Cauliflower / gobi', s: 'florets, raw', k: 30, p: 1.9, c: 5, f: 0.3, fb: 2, v: 1, i: 'broccoli', fresh: 1, unit: { g: 700, s: 'head', p: 'heads' }, src: 'USDA FDC' },
  cabbage: { n: 'Cabbage', s: 'raw', k: 25, p: 1.3, c: 5.8, f: 0.1, fb: 2.5, v: 1, i: 'greens', src: 'USDA FDC' },
  okra: { n: 'Okra / bhindi', s: 'raw', k: 33, p: 2, c: 7, f: 0.2, fb: 3.2, v: 1, i: 'gourd', shop: 'indian', fresh: 1, packs: [500, 250], src: 'USDA FDC' },
  brinjal: { n: 'Aubergine / brinjal', s: 'raw', k: 25, p: 1, c: 6, f: 0.2, fb: 3, v: 1, i: 'gourd', fresh: 1, src: 'USDA FDC' },
  lauki: { n: 'Bottle gourd / lauki', s: 'peeled, raw', k: 14, p: 0.6, c: 2.5, f: 0.1, fb: 1.2, v: 1, i: 'gourd', shop: 'indian', fresh: 1, unit: { g: 800, s: 'lauki', p: 'lauki' }, src: 'IFCT 2017 (secondary)' },
  turai: { n: 'Ridge gourd / turai', s: 'raw', k: 17, p: 0.9, c: 4, f: 0.1, fb: 2, v: 1, i: 'gourd', shop: 'indian', fresh: 1, src: 'Aggregator — WEAK', weak: 1 },
  ashgourd: { n: 'Ash gourd', s: 'raw', k: 13, p: 0.4, c: 3, f: 0.2, fb: 2.9, v: 1, i: 'gourd', shop: 'indian', src: 'Aggregator — WEAK', weak: 1 },
  snakegourd: { n: 'Snake gourd', s: 'raw', k: 18, p: 0.5, c: 3.3, f: 0.3, fb: 0.8, v: 1, i: 'gourd', shop: 'indian', src: 'Aggregator — WEAK', weak: 1 },
  karela: { n: 'Bitter gourd / karela', s: 'raw', k: 21, p: 1, c: 3.7, f: 0.2, fb: 2.8, v: 1, i: 'gourd', shop: 'indian', fresh: 1, unit: { g: 100, s: 'karela', p: 'karela' }, src: 'IFCT — energy varies 19–25 kcal', weak: 1 },
  tinda: { n: 'Tinda', s: 'raw', k: 21, p: 1.4, c: 3.4, f: 0.2, fb: 1.5, v: 1, i: 'gourd', shop: 'indian', src: 'Aggregator — WEAK', weak: 1 },
  parwal: { n: 'Parwal / pointed gourd', s: 'raw', k: 20, p: 2, c: 2, f: 0.3, fb: 3, v: 1, i: 'gourd', shop: 'indian', fresh: 1, src: 'Aggregator — WEAK', weak: 1 },
  tindora: { n: 'Tindora / ivy gourd', s: 'raw', k: 18, p: 1.2, c: 3.1, f: 0.1, fb: 1.6, v: 1, i: 'gourd', shop: 'indian', fresh: 1, src: 'Aggregator — WEAK', weak: 1 },
  gawar: { n: 'Cluster beans / gawar', s: 'raw', k: 16, p: 3.3, c: 10.8, f: 0.4, fb: 3.2, v: 1, i: 'greens', shop: 'indian', fresh: 1, src: 'IFCT 2017 (secondary)' },
  beans: { n: 'French beans', s: 'raw', k: 31, p: 1.8, c: 7, f: 0.1, fb: 3.4, v: 1, i: 'greens', fresh: 1, packs: [500, 220], src: 'USDA FDC' },
  drumstick: { n: 'Drumstick / moringa pods', s: 'raw', k: 35, p: 2.2, c: 3.7, f: 0.15, fb: 3.2, v: 1, i: 'greens', shop: 'indian', fresh: 1, src: 'Aggregator — WEAK', weak: 1 },
  carrot: { n: 'Carrot', s: 'raw', k: 41, p: 0.9, c: 10, f: 0.2, fb: 2.8, v: 1, i: 'gourd', src: 'USDA FDC' },
  capsicum: { n: 'Capsicum, red', s: 'raw', k: 31, p: 1, c: 6, f: 0.3, fb: 2.1, v: 1, i: 'gourd', fresh: 1, unit: { g: 160, s: 'pepper', p: 'peppers' }, src: 'USDA FDC' },
  broccoli: { n: 'Broccoli', s: 'raw florets', k: 34, p: 2.8, c: 7, f: 0.4, fb: 2.6, v: 1, i: 'broccoli', fresh: 1, unit: { g: 350, s: 'head', p: 'heads' }, src: 'USDA FDC' },
  cucumber: { n: 'Cucumber', s: 'raw', k: 15, p: 0.7, c: 3.6, f: 0.1, fb: 0.5, v: 1, i: 'greens', fresh: 1, unit: { g: 300, s: 'cucumber', p: 'cucumbers' }, src: 'USDA FDC' },
  tomato: { n: 'Tomato', s: 'raw', k: 18, p: 0.9, c: 3.9, f: 0.2, fb: 1.2, v: 1, i: 'gourd', fresh: 1, unit: { g: 90, s: 'tomato', p: 'tomatoes' }, src: 'USDA FDC' },
  onion: { n: 'Onion', s: 'raw', k: 40, p: 1.1, c: 9.3, f: 0.1, fb: 1.7, v: 1, i: 'gourd', unit: { g: 110, s: 'onion', p: 'onions' }, src: 'USDA FDC' },
  mooli: { n: 'Radish / mooli', s: 'raw', k: 16, p: 0.7, c: 3.4, f: 0.1, fb: 1.6, v: 1, i: 'gourd', fresh: 1, src: 'USDA FDC' },
  pumpkin: { n: 'Pumpkin', s: 'raw', k: 26, p: 1, c: 6.5, f: 0.1, fb: 0.5, v: 1, i: 'gourd', src: 'USDA FDC' },
  peas: { n: 'Green peas', s: 'raw or frozen', k: 81, p: 5.4, c: 14, f: 0.4, fb: 5, v: 1, i: 'greens', packs: [900, 500], src: 'USDA FDC' },
  berries: { n: 'Blueberries', s: 'fresh or frozen', k: 57, p: 0.7, c: 14.5, f: 0.3, fb: 2.4, v: 1, i: 'greens', frozenok: 1, packs: [500, 350], src: 'USDA FDC' },
  almond: { n: 'Almonds', s: 'about 8 almonds = 10 g — count them, do not grab', k: 579, p: 21.2, c: 21.6, f: 49.9, fb: 12.5, v: 1, i: 'soya', packs: [500, 200], src: 'USDA FDC' },
  apple: { n: 'Apple', s: 'one medium is about 180 g', k: 52, p: 0.3, c: 13.8, f: 0.2, fb: 2.4, v: 1, i: 'greens', fresh: 1, unit: { g: 180, s: 'apple', p: 'apples' }, src: 'USDA FDC' },
  banana: { n: 'Banana', s: 'one medium is about 120 g', k: 89, p: 1.1, c: 22.8, f: 0.3, fb: 2.6, v: 1, i: 'greens', fresh: 1, unit: { g: 120, s: 'banana', p: 'bananas' }, src: 'USDA FDC' },
  orange: { n: 'Orange', s: 'one medium is about 130 g', k: 47, p: 0.9, c: 11.8, f: 0.1, fb: 2.4, v: 1, i: 'greens', fresh: 1, src: 'USDA FDC' },
  papaya: { n: 'Papaya', s: 'cubed', k: 43, p: 0.5, c: 10.8, f: 0.3, fb: 1.7, v: 1, i: 'greens', fresh: 1, src: 'USDA FDC' },
  oil: { n: 'Cooking oil', s: 'per ml — sunflower, rapeseed, groundnut, mustard are identical', k: 813, p: 0, c: 0, f: 92, fb: 0, v: 1, i: 'oil', ml: 1, packs: [1000, 500], src: 'USDA — 884 kcal/100 g, 0.92 g/ml' },
  ghee: { n: 'Ghee', s: 'per ml', k: 828, p: 0, c: 0, f: 92, fb: 0, v: 1, i: 'oil', ml: 1, shop: 'indian', src: 'Heroveda / NutriScan' },
};

export const FOOD_IDS = Object.keys(F);

/** Foods that must be weighed raw or dry. Sixteen of them. */
export const WEIGHED = FOOD_IDS.filter(id => F[id]!.w);
/** Aggregator-sourced or disputed. Thirteen. Flagged on screen. */
export const VERIFY = FOOD_IDS.filter(id => F[id]!.weak);
/** Sold by the item. Eleven. */
export const COUNTABLE = FOOD_IDS.filter(id => F[id]!.unit);
/** Carry a researched price. Seven. */
export const PRICED = FOOD_IDS.filter(id => F[id]!.cost !== undefined);
