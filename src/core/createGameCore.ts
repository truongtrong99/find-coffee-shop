import { createCoolingCurve } from './cooling'
import { GameRuleError } from './errors'
import type { RandomSource, SaveStore } from './ports'
import type { AttemptState, GameContent } from './types'

export interface GameCoreDeps {
  content: GameContent
  saveStore: SaveStore
  random: RandomSource
}

export interface GameCore {
  /** Starts an Attempt of a Cupping Session with every Blind Cup on the table. */
  startAttempt(sessionId: string): void
  /**
   * Advances the game clock by `seconds` of game time. The core has no notion of real
   * time: speed-up is the caller passing larger steps.
   */
  advanceClock(seconds: number): void
  /** The current Attempt, or undefined when none is in progress. A fresh snapshot each call. */
  getAttempt(): AttemptState | undefined
}

export function createGameCore({ content }: GameCoreDeps): GameCore {
  const temperatureAt = createCoolingCurve(content.tuning.cooling)
  let attempt: AttemptState | undefined

  return {
    startAttempt(sessionId) {
      const session = content.labs.flatMap((lab) => lab.sessions).find((s) => s.id === sessionId)
      if (!session) throw new GameRuleError(`Unknown Cupping Session "${sessionId}"`)
      attempt = {
        sessionId,
        elapsedSeconds: 0,
        cups: session.cups.map((cup) => ({
          letter: cup.letter,
          temperature: temperatureAt(0),
        })),
      }
    },
    advanceClock(seconds) {
      if (!attempt) throw new GameRuleError('No Attempt in progress to advance the clock for')
      if (!(seconds >= 0 && Number.isFinite(seconds))) {
        throw new GameRuleError(`Clock can only advance by a finite, non-negative number of seconds, got ${seconds}`)
      }
      const elapsedSeconds = attempt.elapsedSeconds + seconds
      attempt = {
        ...attempt,
        elapsedSeconds,
        cups: attempt.cups.map((cup) => ({ ...cup, temperature: temperatureAt(elapsedSeconds) })),
      }
    },
    getAttempt() {
      return attempt && { ...attempt, cups: attempt.cups.map((cup) => ({ ...cup })) }
    },
  }
}
