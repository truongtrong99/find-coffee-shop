import { assertValidTastingTuning, isStoneCold, windowPosition } from './accuracyWindows'
import { createCoolingCurve } from './cooling'
import { assertStepAllowed, cuesForStep } from './cupping'
import type { CueConditions } from './cupping'
import { GameRuleError } from './errors'
import { biasesShown, cupperJournal } from './cupperJournal'
import { npcRemark, npcScoreCard, planSchedule, seatLineup, summarize } from './npcCuppers'
import type { RandomSource, SaveStore } from './ports'
import {
  assertValidUnlockRules,
  describeUnlock,
  isLabUnlocked,
  labMap,
  loadProgress,
  recordAttempt,
  serializeProgress,
  totalStars,
} from './progression'
import type { Progress } from './progression'
import { ATTRIBUTE_NAMES, isRating, mapAttributes, revealAttempt, unratedAttributes } from './scoring'
import { assertTutorialLineup, assertValidTutorials, tutorialPrompt } from './tutorial'
import type {
  AttemptState,
  Attribute,
  BlindCupContent,
  BlindCupState,
  CuppingSessionContent,
  CupperJournalEntry,
  CuppingStep,
  GameContent,
  LabContent,
  LabMap,
  LineupOptions,
  NpcCupperContent,
  PerformedStep,
  RevealResult,
  TastingCue,
  WindowPosition,
} from './types'

export interface GameCoreDeps {
  content: GameContent
  saveStore: SaveStore
  random: RandomSource
}

export interface GameCore {
  /** The Lab Map: every Lab, whether it is unlocked and the Stars it needs, each Cupping Session's best Stars, and total Stars. */
  getLabMap(): LabMap
  /**
   * The Lab's Seat count and the NPC Cuppers available for a Lineup in this Cupping Session, or for the tutorial,
   * the pre-filled Lineup.
   */
  getLineupOptions(sessionId: string): LineupOptions
  /**
   * Starts an Attempt of a Cupping Session with every Blind Cup on the table and the Lineup's
   * NPC Cuppers (by id) in the Seats. Rejected if the Cupping Session's Lab is locked, or if the Lineup
   * has a locked or repeated NPC Cupper or more NPC Cuppers than Seats; Seats may be left empty.
   * The tutorial only takes its pre-filled Lineup.
   */
  startAttempt(sessionId: string, lineup: readonly string[]): void
  /** Why `startAttempt` would reject this Lineup for this Cupping Session, or undefined if it fits. */
  checkLineup(sessionId: string, lineup: readonly string[]): string | undefined
  /**
   * Advances the game clock by `seconds` of game time. The core has no notion of real
   * time: speed-up is the caller passing larger steps.
   */
  advanceClock(seconds: number): void
  /**
   * Performs a Cupping Step on the Blind Cup with this letter, adding its Tasting Cues to the cup's Cue Log,
   * and returns those cues.
   */
  performStep(cupLetter: string, step: CuppingStep): TastingCue[]
  /** Rates one Attribute on the Player's Score Card for the Blind Cup with this letter, replacing any earlier rating. */
  setRating(cupLetter: string, attribute: Attribute, rating: number): void
  /**
   * Locks in every Score Card, ends the Attempt, keeps its Stars if they are the Cupping Session's best,
   * saves progress and returns the Reveal. Rejected until every Attribute on every Blind Cup is rated.
   */
  submit(): RevealResult
  /**
   * The Player leaves the Lab for the Lab Map. Mid-Attempt this discards the Attempt: no Stars are earned
   * or lost, and nothing is saved. With no Attempt in progress there is nothing to discard.
   */
  leaveLab(): void
  /** The current Attempt, or undefined when none is in progress. A fresh snapshot each call. */
  getAttempt(): AttemptState | undefined
  /** An entry per NPC Cupper, locked or not, in content order: their hint and the Personality Bias Reveals have shown. */
  getCupperJournal(): CupperJournalEntry[]
}

/** What the core tracks for a Blind Cup; snapshots add what is derived from it. */
type CupProgress = Omit<BlindCupState, 'scoreCardComplete' | 'windows' | 'stoneCold'>
type AttemptProgress = Omit<AttemptState, 'cups' | 'npcCuppers' | 'canSubmit' | 'tutorialPrompt'> & { cups: CupProgress[] }

export function createGameCore({ content, saveStore, random }: GameCoreDeps): GameCore {
  const cooling = createCoolingCurve(content.tuning.cooling)
  assertValidTastingTuning(content.tuning.tasting)
  assertValidTutorials(content.labs, content.npcCuppers)
  assertValidUnlockRules(content)
  const { temperatureAt } = cooling
  const { accuracyWindows } = content.tuning.tasting
  const { stoneColdTemperature } = content.tuning.cooling
  let progress: Progress = loadProgress(saveStore.load(), content)
  let attempt: AttemptProgress | undefined
  let cupContents: BlindCupContent[] = []
  /** The Lineup in Seat order, each with every Cupping Step they will perform this Attempt. */
  let seated: { npc: NpcCupperContent; plannedSteps: PerformedStep[] }[] = []
  /** Game seconds up to which the Lineup's remarks are in the Cue Logs. */
  let remarksLoggedTo = -Infinity

  function windowsAt(temperature: number): Record<Attribute, WindowPosition> {
    return mapAttributes((attribute) => windowPosition(temperature, accuracyWindows[attribute], stoneColdTemperature))
  }

  function cueConditionsAt(temperature: number): CueConditions {
    return {
      temperature,
      windows: windowsAt(temperature),
      vagueTastingNotes: content.vagueTastingNotes,
      skewedCueChance: content.tuning.tasting.skewedCueChance,
      random,
    }
  }

  function cupIndex(cupLetter: string): number {
    const index = cupContents.findIndex((cup) => cup.letter === cupLetter)
    if (index === -1) throw new GameRuleError(`There is no Cup ${cupLetter} on the table`)
    return index
  }

  function replaceCup(index: number, cup: CupProgress): void {
    attempt = { ...attempt!, cups: attempt!.cups.map((c, i) => (i === index ? cup : c)) }
  }

  /** Adds every remark made since the last call to its cup's Cue Log, oldest first; at the same moment, in Seat order. */
  function logRemarksMade(): void {
    const { elapsedSeconds } = attempt!
    const made = seated
      .flatMap(({ plannedSteps }) => plannedSteps)
      .filter((step) => step.remark && step.atSeconds > remarksLoggedTo && step.atSeconds <= elapsedSeconds)
      // Sorting is stable, so remarks made at the same moment keep Seat order.
      .sort((a, b) => a.atSeconds - b.atSeconds)
    for (const { cupLetter, remark } of made) {
      const index = cupIndex(cupLetter)
      const cup = attempt!.cups[index]!
      replaceCup(index, { ...cup, cues: [...cup.cues, remark!] })
    }
    remarksLoggedTo = elapsedSeconds
  }

  function findCuppingSession(sessionId: string): { lab: LabContent; session: CuppingSessionContent } {
    for (const lab of content.labs) {
      const session = lab.sessions.find((s) => s.id === sessionId)
      if (session) return { lab, session }
    }
    throw new GameRuleError(`Unknown Cupping Session "${sessionId}"`)
  }

  /** The Lineup's NPC Cuppers in Seat order; throws a GameRuleError naming the first problem. */
  function seatSessionLineup(lab: LabContent, session: CuppingSessionContent, lineup: readonly string[]): NpcCupperContent[] {
    assertTutorialLineup(session, content.npcCuppers, lineup)
    return seatLineup(content.npcCuppers, progress.unlockedNpcCuppers, lab.seats, lineup)
  }

  return {
    getLabMap() {
      return labMap(content.labs, progress.bestStars)
    },
    getLineupOptions(sessionId) {
      const { lab, session } = findCuppingSession(sessionId)
      return {
        seats: lab.seats,
        npcCuppers: content.npcCuppers.filter((npc) => progress.unlockedNpcCuppers.has(npc.id)).map(summarize),
        prefilledLineup:
          session.tutorial &&
          seatLineup(content.npcCuppers, progress.unlockedNpcCuppers, lab.seats, session.tutorial.lineup).map(summarize),
      }
    },
    startAttempt(sessionId, lineup) {
      const { lab, session } = findCuppingSession(sessionId)
      if (!isLabUnlocked(lab, progress.bestStars)) {
        throw new GameRuleError(
          `${lab.name} is locked: it needs ${lab.starsToUnlock} Stars and you have ${totalStars(progress.bestStars)}`,
        )
      }
      const letters = session.cups.map((cup) => cup.letter)
      const lineupNpcs = seatSessionLineup(lab, session, lineup)
      cupContents = session.cups
      seated = lineupNpcs.map((npc) => ({
        npc,
        plannedSteps: planSchedule(npc.schedule, letters, cooling, (cupLetter, temperature) =>
          npcRemark(npc, cupContents[cupIndex(cupLetter)]!, cueConditionsAt(temperature)),
        ),
      }))
      remarksLoggedTo = -Infinity
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
      logRemarksMade()
    },
    checkLineup(sessionId, lineup) {
      const { lab, session } = findCuppingSession(sessionId)
      try {
        seatSessionLineup(lab, session, lineup)
        return undefined
      } catch (error) {
        if (!(error instanceof GameRuleError)) throw error
        return error.message
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
      logRemarksMade()
    },
    performStep(cupLetter, step) {
      if (!attempt) throw new GameRuleError('No Attempt in progress to perform a Cupping Step in')
      const index = cupIndex(cupLetter)
      const cup = attempt.cups[index]!
      assertStepAllowed(cupLetter, cup.completedSteps, step)
      const given = cuesForStep(cupContents[index]!, step, cueConditionsAt(cup.temperature))
      replaceCup(index, { ...cup, completedSteps: [...cup.completedSteps, step], cues: [...cup.cues, ...given] })
      return given.map(copyCue)
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
      const scored = revealAttempt(
        attempt.sessionId,
        cupContents.map((cup, i) => ({
          content: cup,
          scoreCard: attempt!.cups[i]!.scoreCard,
          npcScoreCards: seated.map(({ npc }) => ({
            ...summarize(npc),
            scoreCard: npcScoreCard(npc, cup.referenceScore, content.tuning.npcScoreNoise, random),
          })),
        })),
      )
      attempt = undefined
      const recorded = recordAttempt(content, progress, {
        sessionId: scored.sessionId,
        stars: scored.stars,
        shownBiases: biasesShown(seated.map(({ npc }) => npc), scored.cups),
      })
      progress = recorded.progress
      saveStore.save(serializeProgress(progress))
      return {
        ...scored,
        newBest: recorded.newBest,
        unlockedLabs: recorded.unlockedLabs.map(({ id, name }) => ({ id, name })),
        unlockedNpcCuppers: recorded.unlockedNpcCuppers.map((npc) => ({
          ...summarize(npc),
          unlock: describeUnlock(npc.unlock, content.labs),
        })),
        journalDiscoveries: recorded.discoveries.map(({ npc, attribute, bias }) => ({ ...summarize(npc), attribute, bias })),
      }
    },
    leaveLab() {
      attempt = undefined
    },
    getAttempt() {
      if (!attempt) return undefined
      const cups: BlindCupState[] = attempt.cups.map((cup) => ({
        ...cup,
        completedSteps: [...cup.completedSteps],
        cues: cup.cues.map(copyCue),
        windows: windowsAt(cup.temperature),
        stoneCold: isStoneCold(cup.temperature, stoneColdTemperature),
        scoreCard: { ...cup.scoreCard },
        scoreCardComplete: unratedAttributes(cup.scoreCard).length === 0,
      }))
      return {
        ...attempt,
        cups,
        npcCuppers: seated.map(({ npc, plannedSteps }) => ({
          ...summarize(npc),
          steps: plannedSteps
            .filter((s) => s.atSeconds <= attempt!.elapsedSeconds)
            .map((s) => ({ ...s, remark: s.remark && copyCue(s.remark) })),
        })),
        canSubmit: cups.every((cup) => cup.scoreCardComplete),
        tutorialPrompt: findCuppingSession(attempt.sessionId).session.tutorial && tutorialPrompt(cups),
      }
    },
    getCupperJournal() {
      return cupperJournal(content, progress)
    },
  }
}

function copyCue(cue: TastingCue): TastingCue {
  return { ...cue, remarkBy: cue.remarkBy && { ...cue.remarkBy } }
}
