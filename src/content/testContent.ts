import type { BlindCupContent, GameContent, TastingNotes } from '../core'

/** Every note is distinct so tests can tell which Attribute and rating a cue came from. */
const tastingNotes: TastingNotes = {
  aroma: { 1: 'aroma 1: papery', 2: 'aroma 2: faint', 3: 'aroma 3: nutty', 4: 'aroma 4: floral', 5: 'aroma 5: jasmine burst' },
  flavor: { 1: 'flavor 1: hollow', 2: 'flavor 2: muted', 3: 'flavor 3: cocoa', 4: 'flavor 4: stone fruit', 5: 'flavor 5: layered berries' },
  acidity: { 1: 'acidity 1: flat', 2: 'acidity 2: soft', 3: 'acidity 3: apple', 4: 'acidity 4: bright, lemony', 5: 'acidity 5: sparkling' },
  body: { 1: 'body 1: watery', 2: 'body 2: light', 3: 'body 3: round', 4: 'body 4: creamy', 5: 'body 5: syrupy' },
  sweetness: { 1: 'sweetness 1: bitter', 2: 'sweetness 2: dry', 3: 'sweetness 3: caramel', 4: 'sweetness 4: honeyed', 5: 'sweetness 5: candied' },
}

const threeCups: BlindCupContent[] = [
  { letter: 'A', origin: 'Origin A', story: 'Story of A', referenceScore: { aroma: 4, flavor: 3, acidity: 4, body: 2, sweetness: 3 }, tastingNotes },
  { letter: 'B', origin: 'Origin B', story: 'Story of B', referenceScore: { aroma: 2, flavor: 5, acidity: 1, body: 5, sweetness: 4 }, tastingNotes },
  { letter: 'C', origin: 'Origin C', story: 'Story of C', referenceScore: { aroma: 3, flavor: 3, acidity: 3, body: 3, sweetness: 3 }, tastingNotes },
]

const fourCups: BlindCupContent[] = [
  { letter: 'A', origin: 'Origin 2A', story: 'Story of 2A', referenceScore: { aroma: 5, flavor: 4, acidity: 5, body: 1, sweetness: 2 }, tastingNotes },
  { letter: 'B', origin: 'Origin 2B', story: 'Story of 2B', referenceScore: { aroma: 1, flavor: 2, acidity: 3, body: 4, sweetness: 5 }, tastingNotes },
  { letter: 'C', origin: 'Origin 2C', story: 'Story of 2C', referenceScore: { aroma: 3, flavor: 3, acidity: 2, body: 3, sweetness: 4 }, tastingNotes },
  { letter: 'D', origin: 'Origin 2D', story: 'Story of 2D', referenceScore: { aroma: 2, flavor: 5, acidity: 4, body: 5, sweetness: 1 }, tastingNotes },
]

/** Lab 3's coffees, new to that Lab: the three-cup Reference Scores from other origins. */
const threeCupsInLab3: BlindCupContent[] = threeCups.map((cup) => ({ ...cup, origin: `Origin 3${cup.letter}`, story: `Story of 3${cup.letter}` }))

export interface TestTuningOverrides {
  cooling?: Partial<GameContent['tuning']['cooling']>
  accuracyWindows?: Partial<GameContent['tuning']['tasting']['accuracyWindows']>
  skewedCueChance?: number
  npcScoreNoise?: number
}

/**
 * Small fixture content for facade tests; independent of the shipped v1 content. Lab 1's first Cupping Session is
 * the tutorial. Lab 2 and Lab 3 unlock at the spec's 8 and 18 total Stars: Lab 1's four Cupping Sessions earn at
 * most 12, Lab 2's two another 6. Biscuit unlocks at 6 total Stars, and Saffron by 3-starring Lab 1's
 * "Second Test Session".
 */
export function makeTestContent({
  cooling = {},
  accuracyWindows = {},
  skewedCueChance = 0.5,
  npcScoreNoise = 0,
}: TestTuningOverrides = {}): GameContent {
  return {
    tuning: {
      cooling: {
        startTemperature: 90,
        ambientTemperature: 20,
        stoneColdTemperature: 30,
        secondsToStoneCold: 240,
        ...cooling,
      },
      tasting: {
        // Aroma hot, Body warm, Flavor across a broad middle, Acidity and Sweetness while cooling.
        accuracyWindows: {
          aroma: { min: 70, max: 90 },
          body: { min: 55, max: 75 },
          flavor: { min: 40, max: 80 },
          acidity: { min: 35, max: 55 },
          sweetness: { min: 35, max: 60 },
          ...accuracyWindows,
        },
        skewedCueChance,
      },
      npcScoreNoise,
    },
    vagueTastingNotes: {
      aroma: 'aroma ?: hard to make out',
      flavor: 'flavor ?: hard to make out',
      acidity: 'acidity ?: hard to make out',
      body: 'body ?: hard to make out',
      sweetness: 'sweetness ?: hard to make out',
    },
    npcCuppers: [
      {
        id: 'pip',
        name: 'Pip',
        journalHint: "Pip's hint",
        unlock: { kind: 'starter' },
        personalityBias: { acidity: 2, sweetness: -1 },
        schedule: { secondsBetweenSteps: 5, slurpTemperatures: [70] },
      },
      {
        id: 'mochi',
        name: 'Mochi',
        journalHint: "Mochi's hint",
        unlock: { kind: 'starter' },
        personalityBias: { body: 1 },
        schedule: { secondsBetweenSteps: 4, slurpTemperatures: [50] },
      },
      {
        id: 'juniper',
        name: 'Juniper',
        journalHint: "Juniper's hint",
        unlock: { kind: 'starter' },
        personalityBias: { aroma: -3, flavor: 1 },
        schedule: { secondsBetweenSteps: 6, slurpTemperatures: [65, 40] },
      },
      {
        id: 'biscuit',
        name: 'Biscuit',
        journalHint: "Biscuit's hint",
        unlock: { kind: 'total-stars', stars: 6 },
        personalityBias: { flavor: 1 },
        schedule: { secondsBetweenSteps: 5, slurpTemperatures: [60] },
      },
      {
        id: 'saffron',
        name: 'Saffron',
        journalHint: "Saffron's hint",
        unlock: { kind: 'three-stars', sessionId: 'lab-1-session-2' },
        personalityBias: { sweetness: 1 },
        schedule: { secondsBetweenSteps: 5, slurpTemperatures: [45] },
      },
    ],
    labs: [
      {
        id: 'lab-1',
        name: 'Test Lab',
        starsToUnlock: 0,
        seats: 2,
        cupsPerSession: 3,
        sessions: [
          // The guided tutorial, its Lineup pre-filled out of content order so tests can tell Seat order apart.
          { id: 'lab-1-tutorial', name: 'Test Tutorial', cups: threeCups, tutorial: { lineup: ['mochi', 'pip'] } },
          { id: 'lab-1-session-1', name: 'Test Session', cups: threeCups },
          { id: 'lab-1-session-2', name: 'Second Test Session', cups: threeCups },
          { id: 'lab-1-session-3', name: 'Third Test Session', cups: threeCups },
        ],
      },
      {
        id: 'lab-2',
        name: 'Test Lab 2',
        starsToUnlock: 8,
        seats: 4,
        cupsPerSession: 4,
        sessions: [
          { id: 'lab-2-session-1', name: 'Four-cup Test Session', cups: fourCups },
          { id: 'lab-2-session-2', name: 'Second Four-cup Test Session', cups: fourCups },
        ],
      },
      {
        id: 'lab-3',
        name: 'Test Lab 3',
        starsToUnlock: 18,
        seats: 3,
        cupsPerSession: 3,
        sessions: [{ id: 'lab-3-session-1', name: 'Three-cup Test Session in Lab 3', cups: threeCupsInLab3 }],
      },
    ],
  }
}
