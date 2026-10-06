import type { BlindCupContent, CuppingSessionContent, GameContent, TastingNotes } from '../core'

/** House tasting-note text shared by the v1 coffees; a coffee can author its own instead. */
const houseTastingNotes: TastingNotes = {
  aroma: {
    1: 'barely there, a little papery',
    2: 'faint, toasty grain',
    3: 'pleasant, nutty and warm',
    4: 'fragrant, florals and brown sugar',
    5: 'a burst of jasmine and ripe fruit',
  },
  flavor: {
    1: 'hollow and woody',
    2: 'muted, a touch of cardboard',
    3: 'clean, cocoa and almond',
    4: 'juicy stone fruit and caramel',
    5: 'layered berries, long and vivid',
  },
  acidity: {
    1: 'flat, no sparkle at all',
    2: 'soft and mellow',
    3: 'gentle, like a red apple',
    4: 'bright, lemony',
    5: 'sparkling, like blackcurrant soda',
  },
  body: {
    1: 'thin and watery',
    2: 'light, a little tea-like',
    3: 'round and smooth',
    4: 'creamy, coats the tongue',
    5: 'syrupy and heavy',
  },
  sweetness: {
    1: 'harsh and bitter',
    2: 'dry, barely sweet',
    3: 'mild caramel',
    4: 'honeyed',
    5: 'candied, like ripe mango',
  },
}

/** Lab 2's tasting-note text: a roaster's vocabulary, a step beyond the first Lab's. */
const roasteryTastingNotes: TastingNotes = {
  aroma: {
    1: 'stale, like an old paper bag',
    2: 'toasted bread, not much else',
    3: 'roasted nuts and a little cocoa',
    4: 'brown sugar, cinnamon and dried cherry',
    5: 'wine, ripe berries and spice all at once',
  },
  flavor: {
    1: 'ashy and empty',
    2: 'grainy, a little herbal',
    3: 'milk chocolate and hazelnut',
    4: 'caramel apple and orange peel',
    5: 'blackcurrant jam and red wine',
  },
  acidity: {
    1: 'dull, nothing lifts it',
    2: 'quiet and round',
    3: 'gentle, like a ripe pear',
    4: 'lively, like a fresh orange',
    5: 'tangy and juicy, like grapefruit',
  },
  body: {
    1: 'barely there, like tinted water',
    2: 'silky and light',
    3: 'medium, like whole milk',
    4: 'full and velvety',
    5: 'thick and chewy, almost like syrup',
  },
  sweetness: {
    1: 'bitter, like burnt toast',
    2: 'faintly sweet, a bit dry',
    3: 'soft brown sugar',
    4: 'maple syrup',
    5: 'sweet as ripe plums',
  },
}

/** Lab 3's tasting-note text: competition-table language, where every cup is good and the differences are fine. */
const competitionTastingNotes: TastingNotes = {
  aroma: {
    1: 'muted, with a hint of dusty cardboard',
    2: 'roasted grain and a little wood',
    3: 'dark chocolate and toasted almond',
    4: 'honeysuckle, peach and raw sugar',
    5: 'bergamot, jasmine and white grape',
  },
  flavor: {
    1: 'flat, with a papery finish',
    2: 'woody, with a short finish',
    3: 'cocoa nib and walnut, tidy finish',
    4: 'apricot and black tea, lingering',
    5: 'tropical fruit and florals that never stop',
  },
  acidity: {
    1: 'lifeless',
    2: 'subdued, with only a little lift',
    3: 'balanced, like a yellow apple',
    4: 'crisp, like a green grape',
    5: 'vibrant and complex, like passion fruit',
  },
  body: {
    1: 'hollow',
    2: 'delicate, like jasmine tea',
    3: 'balanced and rounded',
    4: 'plush and buttery',
    5: 'dense and lingering, like melted chocolate',
  },
  sweetness: {
    1: 'astringent and bitter',
    2: 'restrained, a little dry',
    3: 'gentle cane sugar',
    4: 'golden honey',
    5: 'luscious, like candied apricot',
  },
}

type Coffee = Omit<BlindCupContent, 'letter'>

// Lab 1: six classic origins, each with a clear character, so the first Lab's cups are easy to tell apart.

const yirgacheffe: Coffee = {
  origin: 'Yirgacheffe, Ethiopia',
  story:
    'Grown in tiny garden plots high in the hills of Gedeo and washed at a village station, where neighbours bring their cherries in on foot. Coffee was born in Ethiopia, and this cup still tastes of jasmine and lemon.',
  referenceScore: { aroma: 5, flavor: 4, acidity: 5, body: 2, sweetness: 4 },
  tastingNotes: houseTastingNotes,
}

const mandheling: Coffee = {
  origin: 'Mandheling, Sumatra',
  story:
    'Picked by smallholders around Lake Toba and hulled while still wet, a local habit that gives the beans their deep green-blue colour and this heavy, earthy, low-acid cup.',
  referenceScore: { aroma: 3, flavor: 3, acidity: 1, body: 5, sweetness: 2 },
  tastingNotes: houseTastingNotes,
}

const tarrazu: Coffee = {
  origin: 'Tarrazú, Costa Rica',
  story:
    'A honey-processed coffee: the sticky fruit is left on the bean while it dries on raised beds under the mountain sun, soaking it with the sweetness you taste in the cup.',
  referenceScore: { aroma: 4, flavor: 4, acidity: 3, body: 3, sweetness: 5 },
  tastingNotes: houseTastingNotes,
}

const huila: Coffee = {
  origin: 'Huila, Colombia',
  story:
    'Grown on steep slopes between two Andean ranges, where cool nights slow the cherries down so they ripen sweet and balanced, with a soft caramel and red apple cup.',
  referenceScore: { aroma: 3, flavor: 4, acidity: 3, body: 3, sweetness: 4 },
  tastingNotes: houseTastingNotes,
}

const cerrado: Coffee = {
  origin: 'Cerrado Mineiro, Brazil',
  story:
    'Dried whole in the cherry on wide, flat farms of the Brazilian savannah, where a long dry season makes for easy natural processing and a nutty, chocolatey, gentle cup.',
  referenceScore: { aroma: 3, flavor: 3, acidity: 2, body: 4, sweetness: 4 },
  tastingNotes: houseTastingNotes,
}

const antigua: Coffee = {
  origin: 'Antigua, Guatemala',
  story:
    'Grown in a valley ringed by three volcanoes, whose ash enriches the soil and whose shade trees shelter the coffee, giving a cup of cocoa, spice and a little smoke.',
  referenceScore: { aroma: 4, flavor: 3, acidity: 3, body: 4, sweetness: 3 },
  tastingNotes: houseTastingNotes,
}

// Lab 2: eight origins from new countries, some famous, some surprising.

const nyeri: Coffee = {
  origin: 'Nyeri, Kenya',
  story:
    'Grown on the red volcanic soils below Mount Kenya and soaked twice at the washing station, which leaves the cup sparkling with blackcurrant and grapefruit.',
  referenceScore: { aroma: 4, flavor: 5, acidity: 5, body: 3, sweetness: 3 },
  tastingNotes: roasteryTastingNotes,
}

const kona: Coffee = {
  origin: 'Kona, Hawaii',
  story:
    'Grown on the slopes of Hualālai and Mauna Loa, where sunny mornings and cloudy afternoons shade the trees every day, for a mild, smooth and sweet cup.',
  referenceScore: { aroma: 4, flavor: 3, acidity: 2, body: 3, sweetness: 4 },
  tastingNotes: roasteryTastingNotes,
}

const cajamarca: Coffee = {
  origin: 'Cajamarca, Peru',
  story:
    'Grown by co-operatives of small farms in the northern Andes, often organically and under shade, for a clean, light and gently sweet cup.',
  referenceScore: { aroma: 3, flavor: 3, acidity: 3, body: 2, sweetness: 4 },
  tastingNotes: roasteryTastingNotes,
}

const marcala: Coffee = {
  origin: 'Marcala, Honduras',
  story:
    'From the pine-covered highlands of La Paz, where farmers have long dried their coffee on patios and in the sun, giving a caramel and stone fruit cup.',
  referenceScore: { aroma: 3, flavor: 4, acidity: 3, body: 3, sweetness: 3 },
  tastingNotes: roasteryTastingNotes,
}

const chiapas: Coffee = {
  origin: 'Chiapas, Mexico',
  story:
    'Grown in the forests of the Sierra Madre near the border with Guatemala, a soft, nutty everyday coffee with a little milk chocolate.',
  referenceScore: { aroma: 2, flavor: 3, acidity: 2, body: 3, sweetness: 3 },
  tastingNotes: roasteryTastingNotes,
}

const yunnan: Coffee = {
  origin: 'Pu’er, Yunnan, China',
  story:
    'Grown in a province better known for its tea, where coffee is a newer crop on old tea hills; the cup is light and herbal, still finding its feet.',
  referenceScore: { aroma: 3, flavor: 2, acidity: 3, body: 2, sweetness: 3 },
  tastingNotes: roasteryTastingNotes,
}

const bolaven: Coffee = {
  origin: 'Bolaven Plateau, Laos',
  story:
    'Grown on a high, rainy plateau of old volcanic soil, where coffee arrived a century ago; a heavy, earthy cup with not much sparkle.',
  referenceScore: { aroma: 2, flavor: 2, acidity: 2, body: 4, sweetness: 2 },
  tastingNotes: roasteryTastingNotes,
}

const haraz: Coffee = {
  origin: 'Haraz, Yemen',
  story:
    'Grown on ancient stone terraces in the mountains above the Red Sea and dried in the cherry on rooftops, as it has been for centuries; a wild, winey, spicy cup.',
  referenceScore: { aroma: 5, flavor: 5, acidity: 3, body: 4, sweetness: 4 },
  tastingNotes: roasteryTastingNotes,
}

// Lab 3: ten fine coffees from countries no earlier Lab visits, close together so only a calibrated palate tells them apart.

const boquete: Coffee = {
  origin: 'Boquete, Panama',
  story:
    'A Geisha, the variety that stunned competition judges in the early 2000s, grown in cloud forest on the slopes of Volcán Barú; famous for its jasmine and bergamot.',
  referenceScore: { aroma: 5, flavor: 5, acidity: 4, body: 2, sweetness: 5 },
  tastingNotes: competitionTastingNotes,
}

const huye: Coffee = {
  origin: 'Huye, Rwanda',
  story:
    'Grown on the green hills of southern Rwanda, often called the land of a thousand hills, and washed at a station shared by hundreds of small farms.',
  referenceScore: { aroma: 4, flavor: 4, acidity: 4, body: 3, sweetness: 4 },
  tastingNotes: competitionTastingNotes,
}

const kayanza: Coffee = {
  origin: 'Kayanza, Burundi',
  story:
    'Grown in the high north of Burundi by farmers with only a few hundred trees each, then sorted by hand on raised beds until every bean is perfect.',
  referenceScore: { aroma: 4, flavor: 4, acidity: 5, body: 3, sweetness: 3 },
  tastingNotes: competitionTastingNotes,
}

const kilimanjaro: Coffee = {
  origin: 'Kilimanjaro, Tanzania',
  story:
    'Peaberries from the foothills of Africa’s highest mountain: single round beans, one to a cherry instead of the usual two, picked out by hand and prized for their bright cup.',
  referenceScore: { aroma: 4, flavor: 4, acidity: 4, body: 2, sweetness: 3 },
  tastingNotes: competitionTastingNotes,
}

const mountElgon: Coffee = {
  origin: 'Mount Elgon, Uganda',
  story:
    'Grown on the slopes of an old volcano on the Kenyan border, in a country better known for robusta; this arabica is full-bodied, sweet and quietly fruity.',
  referenceScore: { aroma: 3, flavor: 4, acidity: 3, body: 4, sweetness: 4 },
  tastingNotes: competitionTastingNotes,
}

const chikmagalur: Coffee = {
  origin: 'Chikmagalur, India',
  story:
    'Grown under a canopy of tall shade trees alongside pepper vines and cardamom, near where coffee was first planted in India; a heavy, spicy, low-acid cup.',
  referenceScore: { aroma: 3, flavor: 3, acidity: 2, body: 4, sweetness: 3 },
  tastingNotes: competitionTastingNotes,
}

const easternHighlands: Coffee = {
  origin: 'Eastern Highlands, Papua New Guinea',
  story:
    'Grown in village gardens in the mountain valleys around Goroka, where most coffee comes from a few trees beside the family home; a juicy, tropical cup.',
  referenceScore: { aroma: 3, flavor: 4, acidity: 3, body: 3, sweetness: 4 },
  tastingNotes: competitionTastingNotes,
}

const santaAna: Coffee = {
  origin: 'Santa Ana, El Salvador',
  story:
    'A Pacamara, a giant-beaned variety bred in El Salvador, grown on the slopes of the Santa Ana volcano; plush, sweet and full of fruit.',
  referenceScore: { aroma: 4, flavor: 4, acidity: 3, body: 4, sweetness: 4 },
  tastingNotes: competitionTastingNotes,
}

const jinotega: Coffee = {
  origin: 'Jinotega, Nicaragua',
  story:
    'Grown in the misty northern mountains known as the city of mists, where much of Nicaragua’s coffee comes from; a balanced, gently sweet cup.',
  referenceScore: { aroma: 3, flavor: 3, acidity: 3, body: 3, sweetness: 4 },
  tastingNotes: competitionTastingNotes,
}

const galapagos: Coffee = {
  origin: 'San Cristóbal, Galápagos',
  story:
    'Grown in the cool highlands of a volcanic island hundreds of miles out in the Pacific, where the ocean breeze ripens the cherries slowly.',
  referenceScore: { aroma: 4, flavor: 4, acidity: 3, body: 3, sweetness: 3 },
  tastingNotes: competitionTastingNotes,
}

const LETTERS = 'ABCDE'

/** A hand-authored Cupping Session: its coffees as Blind Cups lettered A, B, C, … in this order. */
function session(id: string, name: string, coffees: readonly Coffee[]): CuppingSessionContent {
  return { id, name, cups: coffees.map((coffee, cup) => ({ letter: LETTERS[cup]!, ...coffee })) }
}

/**
 * v1 content: 3 Labs of 4 Cupping Sessions with 3, 4 and 5 Blind Cups around tables of 2, 3 and 4 Seats, each Lab
 * cupping 6, 8 and 10 coffees new to it, every one twice. Lab 1's first Cupping Session is the guided tutorial.
 * 7 NPC Cuppers: the 2 starters, both seated in the tutorial, 3 unlocking at 6, 12 and 24 total Stars, and 2
 * impressed by the Player's palate in Lab 1's and Lab 2's finales.
 */
export const content: GameContent = {
  tuning: {
    cooling: {
      startTemperature: 85,
      ambientTemperature: 20,
      stoneColdTemperature: 30,
      // Hot to cold in 4 game minutes at normal speed.
      secondsToStoneCold: 240,
    },
    tasting: {
      // Aroma is best judged hot, Body warm, Acidity and Sweetness while cooling, Flavor across a broad middle.
      // Aroma is readable from the start, Sweetness and Acidity from about 70–80 game seconds, and
      // nothing once stone cold at 4 minutes.
      accuracyWindows: {
        aroma: { min: 68, max: 85 },
        body: { min: 55, max: 70 },
        flavor: { min: 42, max: 75 },
        acidity: { min: 35, max: 55 },
        sweetness: { min: 36, max: 58 },
      },
      // Outside its window, a cue is as likely to mislead (one cup off) as to be vague.
      skewedCueChance: 0.5,
    },
    // NPC ratings stray up to ¾ of a cup from Reference Score plus Personality Bias, so roughly
    // half of them land one cup off.
    npcScoreNoise: 0.75,
  },
  vagueTastingNotes: {
    aroma: 'too muddled to tell how fragrant it is',
    flavor: 'hard to pick out any flavor',
    acidity: "can't tell how bright it is",
    body: 'hard to judge the body',
    sweetness: "can't tell how sweet it is",
  },
  npcCuppers: [
    {
      id: 'pip',
      name: 'Pip',
      journalHint: 'Loves bright coffees.',
      unlock: { kind: 'starter' },
      personalityBias: { acidity: 1, body: -1 },
      // Impatient: rushes through the steps and slurps while the cups are still hot.
      schedule: { secondsBetweenSteps: 3, slurpTemperatures: [70, 58] },
    },
    {
      id: 'mochi',
      name: 'Mochi',
      journalHint: 'Has a sweet tooth.',
      unlock: { kind: 'starter' },
      personalityBias: { sweetness: 1, aroma: 1 },
      // Patient: takes their time and waits for the cups to cool.
      schedule: { secondsBetweenSteps: 6, slurpTemperatures: [55, 42, 34] },
    },
    {
      id: 'biscuit',
      name: 'Biscuit',
      journalHint: 'Likes a coffee with some weight to it.',
      unlock: { kind: 'total-stars', stars: 6 },
      personalityBias: { body: 1, acidity: -1 },
      schedule: { secondsBetweenSteps: 4, slurpTemperatures: [62, 45] },
    },
    {
      id: 'juniper',
      name: 'Juniper',
      journalHint: 'Not one for sugary cups.',
      unlock: { kind: 'three-stars', sessionId: 'lab-1-session-4' },
      personalityBias: { sweetness: -1 },
      schedule: { secondsBetweenSteps: 5, slurpTemperatures: [57, 40] },
    },
    {
      id: 'clover',
      name: 'Clover',
      journalHint: 'Rarely as impressed as everyone else.',
      unlock: { kind: 'total-stars', stars: 12 },
      personalityBias: { flavor: -1, aroma: -1 },
      // Patient: waits for the cups to cool.
      schedule: { secondsBetweenSteps: 6, slurpTemperatures: [50, 38] },
    },
    {
      id: 'hazel',
      name: 'Hazel',
      journalHint: 'Hard to win over by smell alone.',
      unlock: { kind: 'three-stars', sessionId: 'lab-2-session-4' },
      personalityBias: { aroma: -1, flavor: 1 },
      schedule: { secondsBetweenSteps: 4, slurpTemperatures: [66, 48] },
    },
    {
      id: 'saffron',
      name: 'Saffron',
      journalHint: "Can't get enough of a big, fruity cup.",
      unlock: { kind: 'total-stars', stars: 24 },
      personalityBias: { flavor: 1, acidity: 1 },
      // Impatient: slurps while the cups are still hot.
      schedule: { secondsBetweenSteps: 3, slurpTemperatures: [72, 52] },
    },
  ],
  labs: [
    {
      id: 'lab-1',
      name: 'The First Lab',
      starsToUnlock: 0,
      seats: 2,
      sessions: [
        // The tutorial: three coffees as different as can be.
        { ...session('lab-1-session-1', 'First Cupping', [yirgacheffe, mandheling, tarrazu]), tutorial: { lineup: ['pip', 'mochi'] } },
        session('lab-1-session-2', 'Morning Table', [huila, cerrado, antigua]),
        session('lab-1-session-3', 'Three Origins', [cerrado, yirgacheffe, huila]),
        session('lab-1-session-4', 'Lab 1 Finale', [antigua, tarrazu, mandheling]),
      ],
    },
    {
      id: 'lab-2',
      name: 'The Roastery Lab',
      starsToUnlock: 8,
      seats: 3,
      sessions: [
        session('lab-2-session-1', 'Four Corners', [nyeri, kona, cajamarca, yunnan]),
        session('lab-2-session-2', "Roaster's Choice", [marcala, haraz, chiapas, bolaven]),
        session('lab-2-session-3', 'Washed and Natural', [cajamarca, haraz, nyeri, bolaven]),
        session('lab-2-session-4', 'Lab 2 Finale', [kona, chiapas, yunnan, marcala]),
      ],
    },
    {
      id: 'lab-3',
      name: 'The Competition Lab',
      starsToUnlock: 18,
      seats: 4,
      sessions: [
        session('lab-3-session-1', 'Five Flights', [huye, boquete, chikmagalur, kilimanjaro, santaAna]),
        session('lab-3-session-2', "Cuppers' Table", [jinotega, kayanza, galapagos, mountElgon, easternHighlands]),
        session('lab-3-session-3', 'Blind Finals', [santaAna, huye, kayanza, galapagos, chikmagalur]),
        session('lab-3-session-4', 'Grand Finale', [mountElgon, kilimanjaro, easternHighlands, boquete, jinotega]),
      ],
    },
  ],
}
