import type { GameContent, TastingNotes } from '../core'

/** Every note is distinct so tests can tell which Attribute and rating a cue came from. */
const tastingNotes: TastingNotes = {
  aroma: { 1: 'aroma 1: papery', 2: 'aroma 2: faint', 3: 'aroma 3: nutty', 4: 'aroma 4: floral', 5: 'aroma 5: jasmine burst' },
  flavor: { 1: 'flavor 1: hollow', 2: 'flavor 2: muted', 3: 'flavor 3: cocoa', 4: 'flavor 4: stone fruit', 5: 'flavor 5: layered berries' },
  acidity: { 1: 'acidity 1: flat', 2: 'acidity 2: soft', 3: 'acidity 3: apple', 4: 'acidity 4: bright, lemony', 5: 'acidity 5: sparkling' },
  body: { 1: 'body 1: watery', 2: 'body 2: light', 3: 'body 3: round', 4: 'body 4: creamy', 5: 'body 5: syrupy' },
  sweetness: { 1: 'sweetness 1: bitter', 2: 'sweetness 2: dry', 3: 'sweetness 3: caramel', 4: 'sweetness 4: honeyed', 5: 'sweetness 5: candied' },
}

export interface TestTuningOverrides {
  cooling?: Partial<GameContent['tuning']['cooling']>
  npcScoreNoise?: number
}

/** Small fixture content for facade tests; independent of the shipped v1 content. */
export function makeTestContent({ cooling = {}, npcScoreNoise = 0 }: TestTuningOverrides = {}): GameContent {
  return {
    tuning: {
      cooling: {
        startTemperature: 90,
        ambientTemperature: 20,
        stoneColdTemperature: 30,
        secondsToStoneCold: 240,
        ...cooling,
      },
      npcScoreNoise,
    },
    npcCuppers: [
      {
        id: 'pip',
        name: 'Pip',
        unlock: { kind: 'starter' },
        personalityBias: { acidity: 2, sweetness: -1 },
        schedule: { secondsBetweenSteps: 5, slurpTemperatures: [70] },
      },
      {
        id: 'mochi',
        name: 'Mochi',
        unlock: { kind: 'starter' },
        personalityBias: { body: 1 },
        schedule: { secondsBetweenSteps: 4, slurpTemperatures: [50] },
      },
      {
        id: 'juniper',
        name: 'Juniper',
        unlock: { kind: 'starter' },
        personalityBias: { aroma: -3, flavor: 1 },
        schedule: { secondsBetweenSteps: 6, slurpTemperatures: [65, 40] },
      },
      {
        id: 'biscuit',
        name: 'Biscuit',
        unlock: { kind: 'total-stars', stars: 6 },
        personalityBias: { flavor: 1 },
        schedule: { secondsBetweenSteps: 5, slurpTemperatures: [60] },
      },
    ],
    labs: [
      {
        id: 'lab-1',
        name: 'Test Lab',
        seats: 2,
        sessions: [
          {
            id: 'lab-1-session-1',
            name: 'Test Session',
            cups: [
              { letter: 'A', origin: 'Origin A', story: 'Story of A', referenceScore: { aroma: 4, flavor: 3, acidity: 4, body: 2, sweetness: 3 }, tastingNotes },
              { letter: 'B', origin: 'Origin B', story: 'Story of B', referenceScore: { aroma: 2, flavor: 5, acidity: 1, body: 5, sweetness: 4 }, tastingNotes },
              { letter: 'C', origin: 'Origin C', story: 'Story of C', referenceScore: { aroma: 3, flavor: 3, acidity: 3, body: 3, sweetness: 3 }, tastingNotes },
            ],
          },
        ],
      },
      {
        id: 'lab-2',
        name: 'Test Lab 2',
        seats: 4,
        sessions: [
          {
            id: 'lab-2-session-1',
            name: 'Four-cup Test Session',
            cups: [
              { letter: 'A', origin: 'Origin 2A', story: 'Story of 2A', referenceScore: { aroma: 5, flavor: 4, acidity: 5, body: 1, sweetness: 2 }, tastingNotes },
              { letter: 'B', origin: 'Origin 2B', story: 'Story of 2B', referenceScore: { aroma: 1, flavor: 2, acidity: 3, body: 4, sweetness: 5 }, tastingNotes },
              { letter: 'C', origin: 'Origin 2C', story: 'Story of 2C', referenceScore: { aroma: 3, flavor: 3, acidity: 2, body: 3, sweetness: 4 }, tastingNotes },
              { letter: 'D', origin: 'Origin 2D', story: 'Story of 2D', referenceScore: { aroma: 2, flavor: 5, acidity: 4, body: 5, sweetness: 1 }, tastingNotes },
            ],
          },
        ],
      },
    ],
  }
}
