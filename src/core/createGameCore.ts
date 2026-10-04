import { createCoolingCurve } from './cooling'
import { assertStepAllowed, cuesForStep } from './cupping'
import { GameRuleError } from './errors'
import { isUnlocked, npcScoreCard, planSchedule, seatLineup } from './npcCuppers'
import type { RandomSource, SaveStore } from './ports'
import { ATTRIBUTE_NAMES, isRating, revealAttempt, unratedAttributes } from './scoring'
import type {
  AttemptState,
  Attribute,
  BlindCupContent,
  BlindCupState,
  CuppingSessionContent,
  CuppingStep,
  GameContent,
  LabContent,
  LineupOptions,
  NpcCupperContent,
  PerformedStep,
  RevealResult,
} from './types'

export interface GameCoreDeps {
  content: GameContent
  saveStore: SaveStore
  random: RandomSource
}

export interface GameCore {
  /** The Lab's Seat count and the NPC Cuppers available for a Lineup in this Cupping Session. */
  getLineupOptions(sessionId: string): LineupOptions
  /**
   * Starts an Attempt of a Cupping Session with every Blind Cup on the table and the Lineup's
   * NPC Cuppers (by id) in the Seats. Rejected if the Lineup has a locked or repeated NPC Cupper
   * or more NPC Cuppers than Seats; Seats may be left empty.
   */
  startAttempt(sessionId: string, lineup: readonly string[]): void
  /**
   * Advances the game clock by `seconds` of game time. The core has no notion of real
   * time: speed-up is the caller passing larger steps.
   */
  advanceClock(seconds: number): void
  /** Performs a Cupping Step on the Blind Cup with this letter, adding its Tasting Cues to the cup's Cue Log. */
  performStep(cupLetter: string, step: CuppingStep): void
  /** Rates one Attribute on the Player's Score Card for the Blind Cup with this letter, replacing any earlier rating. */
  setRating(cupLetter: string, attribute: Attribute, rating: number): void
  /**
   * Locks in every Score Card, ends the Attempt and returns the Reveal.
   * Rejected until every Attribute on every Blind Cup is rated.
   */
  submit(): RevealResult
  /** The current Attempt, or undefined when none is in progress. A fresh snapshot each call. */
  getAttempt(): AttemptState | undefined
}

/** What the core tracks for a Blind Cup; snapshots add what is derived from it. */
type CupProgress = Omit<BlindCupState, 'scoreCardComplete'>
type AttemptProgress = Omit<AttemptState, 'cups' | 'npcCuppers' | 'canSubmit'> & { cups: CupProgress[] }

export function createGameCore({ content, random }: GameCoreDeps): GameCore {
  const cooling = createCoolingCurve(content.tuning.cooling)
  const { temperatureAt } = cooling
  let attempt: AttemptProgress | undefined
  let cupContents: BlindCupContent[] = []
  /** The Lineup in Seat order, each with every Cupping Step they will perform this Attempt. */
  let seated: { npc: NpcCupperContent; plannedSteps: PerformedStep[] }[] = []

  function cupIndex(cupLetter: string): number {
    const index = cupContents.findIndex((cup) => cup.letter === cupLetter)
    if (index === -1) throw new GameRuleError(`There is no Cup ${cupLetter} on the table`)
    return index
  }

  function replaceCup(index: number, cup: CupProgress): void {
    attempt = { ...attempt!, cups: attempt!.cups.map((c, i) => (i === index ? cup : c)) }
  }

  function findSession(sessionId: string): { lab: LabContent; session: CuppingSessionContent } {
    for (const lab of content.labs) {
      const session = lab.sessions.find((s) => s.id === sessionId)
      if (session) return { lab, session }
    }
    throw new GameRuleError(`Unknown Cupping Session "${sessionId}"`)
  }

  return {
    getLineupOptions(sessionId) {
      const { lab } = findSession(sessionId)
      return {
        seats: lab.seats,
        npcCuppers: content.npcCuppers.filter(isUnlocked).map(({ id, name }) => ({ id, name })),
      }
    },
    startAttempt(sessionId, lineup) {
      const { lab, session } = findSession(sessionId)
      const letters = session.cups.map((cup) => cup.letter)
      seated = seatLineup(content.npcCuppers, lab.seats, lineup).map((npc) => ({
        npc,
        plannedSteps: planSchedule(npc.schedule, letters, cooling),
      }))
      cupContents = session.cups
      attempt = {
        sessionId,
        elapsedSeconds: 0,
        cups: session.cups.map((cup) => ({
          letter: cup.letter,
          temperature: temperatureAt(0),
          completedSteps: [],
          cues: [],
          scoreCard: {},
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
      const index = cupIndex(cupLetter)
      const cup = attempt.cups[index]!
      assertStepAllowed(cupLetter, cup.completedSteps, step)
      replaceCup(index, {
        ...cup,
        completedSteps: [...cup.completedSteps, step],
        cues: [...cup.cues, ...cuesForStep(cupContents[index]!, step)],
      })
    },
    setRating(cupLetter, attribute, rating) {
      if (!attempt) throw new GameRuleError('No Attempt in progress to rate a Score Card in')
      const index = cupIndex(cupLetter)
      if (!isRating(rating)) {
        throw new GameRuleError(`Cup ${cupLetter}: ratings are whole steps from 1 to 5 cups, got ${rating}`)
      }
      const cup = attempt.cups[index]!
      replaceCup(index, { ...cup, scoreCard: { ...cup.scoreCard, [attribute]: rating } })
    },
    submit() {
      if (!attempt) throw new GameRuleError('No Attempt in progress to Submit')
      const gaps = attempt.cups
        .map((cup) => ({ letter: cup.letter, unrated: unratedAttributes(cup.scoreCard) }))
        .filter(({ unrated }) => unrated.length > 0)
      if (gaps.length > 0) {
        const missing = gaps.map(({ letter, unrated }) => `Cup ${letter}: ${unrated.map((a) => ATTRIBUTE_NAMES[a]).join(', ')}`)
        throw new GameRuleError(`Rate every Attribute before Submit; still unrated: ${missing.join('; ')}`)
      }
      const reveal = revealAttempt(
        attempt.sessionId,
        cupContents.map((cup, i) => ({
          content: cup,
          scoreCard: attempt!.cups[i]!.scoreCard,
          npcScoreCards: seated.map(({ npc }) => ({
            id: npc.id,
            name: npc.name,
            scoreCard: npcScoreCard(npc, cup.referenceScore, content.tuning.npcScoreNoise, random),
          })),
        })),
      )
      attempt = undefined
      return reveal
    },
    getAttempt() {
      return (
        attempt && {
          ...attempt,
          cups: attempt.cups.map((cup) => ({
            ...cup,
            completedSteps: [...cup.completedSteps],
            cues: cup.cues.map((cue) => ({ ...cue })),
            scoreCard: { ...cup.scoreCard },
            scoreCardComplete: unratedAttributes(cup.scoreCard).length === 0,
          })),
          npcCuppers: seated.map(({ npc, plannedSteps }) => ({
            id: npc.id,
            name: npc.name,
            steps: plannedSteps.filter((s) => s.atSeconds <= attempt!.elapsedSeconds).map((s) => ({ ...s })),
          })),
          canSubmit: attempt.cups.every((cup) => unratedAttributes(cup.scoreCard).length === 0),
        }
      )
    },
  }
}
