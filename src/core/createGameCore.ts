import { createCoolingCurve } from './cooling'
import { assertStepAllowed, cuesForStep } from './cupping'
import { GameRuleError } from './errors'
import type { RandomSource, SaveStore } from './ports'
import type { AttemptState, BlindCupContent, CuppingStep, GameContent } from './types'

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
  /** Performs a Cupping Step on the Blind Cup with this letter, adding its Tasting Cues to the cup's Cue Log. */
  performStep(cupLetter: string, step: CuppingStep): void
  /** The current Attempt, or undefined when none is in progress. A fresh snapshot each call. */
  getAttempt(): AttemptState | undefined
}

export function createGameCore({ content }: GameCoreDeps): GameCore {
  const temperatureAt = createCoolingCurve(content.tuning.cooling)
  let attempt: AttemptState | undefined
  let cupContents: BlindCupContent[] = []

  return {
    startAttempt(sessionId) {
      const session = content.labs.flatMap((lab) => lab.sessions).find((s) => s.id === sessionId)
      if (!session) throw new GameRuleError(`Unknown Cupping Session "${sessionId}"`)
      cupContents = session.cups
      attempt = {
        sessionId,
        elapsedSeconds: 0,
        cups: session.cups.map((cup) => ({
          letter: cup.letter,
          temperature: temperatureAt(0),
          completedSteps: [],
          cues: [],
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
    performStep(cupLetter, step) {
      if (!attempt) throw new GameRuleError('No Attempt in progress to perform a Cupping Step in')
      const index = cupContents.findIndex((cup) => cup.letter === cupLetter)
      if (index === -1) throw new GameRuleError(`There is no Cup ${cupLetter} on the table`)
      const cup = attempt.cups[index]!
      assertStepAllowed(cupLetter, cup.completedSteps, step)
      const cupped = {
        ...cup,
        completedSteps: [...cup.completedSteps, step],
        cues: [...cup.cues, ...cuesForStep(cupContents[index]!, step)],
      }
      attempt = { ...attempt, cups: attempt.cups.map((c, i) => (i === index ? cupped : c)) }
    },
    getAttempt() {
      return (
        attempt && {
          ...attempt,
          cups: attempt.cups.map((cup) => ({
            ...cup,
            completedSteps: [...cup.completedSteps],
            cues: cup.cues.map((cue) => ({ ...cue })),
          })),
        }
      )
    },
  }
}
