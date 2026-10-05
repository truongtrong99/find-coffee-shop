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

type Coffee = Omit<BlindCupContent, 'letter'>

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
  referenceScore: { aroma: 3, flavor: 3, acidity: 2, body: 4, sweetness: 3 },
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

const nyeri: Coffee = {
  origin: 'Nyeri, Kenya',
  story:
    'Grown on the red volcanic soils below Mount Kenya and soaked twice at the washing station, which leaves the cup sparkling with blackcurrant and grapefruit.',
  referenceScore: { aroma: 4, flavor: 5, acidity: 5, body: 3, sweetness: 3 },
  tastingNotes: houseTastingNotes,
}

const LETTERS = 'ABCDE'

/** One Cupping Session per name, each with every coffee as a Blind Cup, rotated so no two sessions share an order. */
function placeholderSessions(labId: string, names: readonly string[], coffees: readonly Coffee[]): CuppingSessionContent[] {
  return names.map((name, i) => ({
    id: `${labId}-session-${i + 1}`,
    name,
    cups: coffees.map((_, cup) => ({ letter: LETTERS[cup]!, ...coffees[(cup + i) % coffees.length]! })),
  }))
}

/** Makes the first of these Cupping Sessions the guided tutorial, its Seats pre-filled with this Lineup. */
function asTutorial([first, ...rest]: CuppingSessionContent[], lineup: string[]): CuppingSessionContent[] {
  return [{ ...first!, tutorial: { lineup } }, ...rest]
}

/**
 * v1 content so far: 3 Labs of placeholder Cupping Sessions with 3, 4 and 5 Blind Cups, Lab 1's first being the
 * guided tutorial, and 7 NPC Cuppers: the 2 starters, both seated in the tutorial, 3 unlocking at 6, 12 and 24 total
 * Stars, and 2 impressed by the Player's palate in Lab 1's and Lab 2's finales.
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
    // Placeholder Cupping Sessions until the v1 content lands (#11): each Lab rotates the same coffees.
    {
      id: 'lab-1',
      name: 'The First Lab',
      starsToUnlock: 0,
      seats: 2,
      sessions: asTutorial(
        placeholderSessions('lab-1', ['First Cupping', 'Morning Table', 'Three Origins', 'Lab 1 Finale'], [yirgacheffe, mandheling, tarrazu]),
        ['pip', 'mochi'],
      ),
    },
    {
      id: 'lab-2',
      name: 'The Roastery Lab',
      starsToUnlock: 8,
      seats: 3,
      sessions: placeholderSessions('lab-2', ['Four Corners', "Roaster's Choice", 'Washed and Natural', 'Lab 2 Finale'], [yirgacheffe, mandheling, tarrazu, huila]),
    },
    {
      id: 'lab-3',
      name: 'The Competition Lab',
      starsToUnlock: 18,
      seats: 4,
      sessions: placeholderSessions('lab-3', ['Five Flights', "Cuppers' Table", 'Blind Finals', 'Grand Finale'], [yirgacheffe, mandheling, tarrazu, huila, nyeri]),
    },
  ],
}
