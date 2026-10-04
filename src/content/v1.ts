import type { GameContent, TastingNotes } from '../core'

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

/** Walking-skeleton content: one Lab with one hard-coded Cupping Session of 3 Blind Cups, and the 2 starter NPC Cuppers. */
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
      unlock: { kind: 'starter' },
      // Loves bright coffees.
      personalityBias: { acidity: 1, body: -1 },
      // Impatient: rushes through the steps and slurps while the cups are still hot.
      schedule: { secondsBetweenSteps: 3, slurpTemperatures: [70, 58] },
    },
    {
      id: 'mochi',
      name: 'Mochi',
      unlock: { kind: 'starter' },
      // Has a sweet tooth.
      personalityBias: { sweetness: 1, aroma: 1 },
      // Patient: takes their time and waits for the cups to cool.
      schedule: { secondsBetweenSteps: 6, slurpTemperatures: [55, 42, 34] },
    },
  ],
  labs: [
    {
      id: 'lab-1',
      name: 'The First Lab',
      seats: 2,
      sessions: [
        {
          id: 'lab-1-session-1',
          name: 'First Cupping',
          cups: [
            {
              letter: 'A',
              origin: 'Yirgacheffe, Ethiopia',
              story:
                'Grown in tiny garden plots high in the hills of Gedeo and washed at a village station, where neighbours bring their cherries in on foot. Coffee was born in Ethiopia, and this cup still tastes of jasmine and lemon.',
              referenceScore: { aroma: 5, flavor: 4, acidity: 5, body: 2, sweetness: 4 },
              tastingNotes: houseTastingNotes,
            },
            {
              letter: 'B',
              origin: 'Mandheling, Sumatra',
              story:
                'Picked by smallholders around Lake Toba and hulled while still wet, a local habit that gives the beans their deep green-blue colour and this heavy, earthy, low-acid cup.',
              referenceScore: { aroma: 3, flavor: 3, acidity: 2, body: 4, sweetness: 3 },
              tastingNotes: houseTastingNotes,
            },
            {
              letter: 'C',
              origin: 'Tarrazú, Costa Rica',
              story:
                'A honey-processed coffee: the sticky fruit is left on the bean while it dries on raised beds under the mountain sun, soaking it with the sweetness you taste in the cup.',
              referenceScore: { aroma: 4, flavor: 4, acidity: 3, body: 3, sweetness: 5 },
              tastingNotes: houseTastingNotes,
            },
          ],
        },
      ],
    },
  ],
}

export const firstSession = content.labs[0]!.sessions[0]!
