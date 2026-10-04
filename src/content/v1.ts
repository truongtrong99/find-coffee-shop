import type { GameContent } from '../core'

/** Walking-skeleton content: one Lab with one hard-coded Cupping Session of 3 Blind Cups. */
export const content: GameContent = {
  tuning: {
    cooling: {
      startTemperature: 85,
      ambientTemperature: 20,
      stoneColdTemperature: 30,
      // Hot to cold in 4 game minutes at normal speed.
      secondsToStoneCold: 240,
    },
  },
  labs: [
    {
      id: 'lab-1',
      name: 'The First Lab',
      sessions: [
        {
          id: 'lab-1-session-1',
          name: 'First Cupping',
          cups: [{ letter: 'A' }, { letter: 'B' }, { letter: 'C' }],
        },
      ],
    },
  ],
}

export const firstSession = content.labs[0]!.sessions[0]!
