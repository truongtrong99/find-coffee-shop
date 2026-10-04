import type { GameContent } from '../core'

/** Small fixture content for facade tests; independent of the shipped v1 content. */
export function makeTestContent(overrides: Partial<GameContent['tuning']['cooling']> = {}): GameContent {
  return {
    tuning: {
      cooling: {
        startTemperature: 90,
        ambientTemperature: 20,
        stoneColdTemperature: 30,
        secondsToStoneCold: 240,
        ...overrides,
      },
    },
    labs: [
      {
        id: 'lab-1',
        name: 'Test Lab',
        sessions: [
          {
            id: 'lab-1-session-1',
            name: 'Test Session',
            cups: [{ letter: 'A' }, { letter: 'B' }, { letter: 'C' }],
          },
        ],
      },
    ],
  }
}
