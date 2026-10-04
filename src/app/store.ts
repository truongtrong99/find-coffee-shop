import { create } from 'zustand'
import { content, firstSession } from '../content/v1'
import { createGameCore, GameRuleError } from '../core'
import type { AttemptState, Attribute, CuppingStep, LineupOptions, RevealResult } from '../core'
import { createLocalStorageSaveStore } from './localStorageSaveStore'

export const SPEEDS = [1, 2, 4, 8] as const
export type Speed = (typeof SPEEDS)[number]

// Real frames longer than this (e.g. a backgrounded tab) are clamped so cups don't jump to cold.
// The first frame's delta can be slightly negative (the frame timestamp predates the loop starting).
const MAX_REAL_STEP_SECONDS = 0.1

// How long the camera lingers in first-person after a Cupping Step before returning to the diorama.
// Presentation only: it never affects the game clock.
const FIRST_PERSON_REAL_SECONDS = 2.5

const core = createGameCore({
  content,
  saveStore: createLocalStorageSaveStore(),
  random: { next: Math.random },
})

interface GameStore {
  /** What the Lineup screen offers before an Attempt. */
  lineupOptions: LineupOptions
  /** The NPC Cuppers picked for the next Attempt, in Seat order. */
  lineup: string[]
  /** The Attempt in progress, the last snapshot of it once Submitted, or null while choosing a Lineup. */
  attempt: AttemptState | null
  /** The Reveal of the Submitted Attempt, or null while cupping. */
  reveal: RevealResult | null
  speed: Speed
  /** The Blind Cup the Player is looking at; they may move between cups freely. */
  selectedLetter: string
  /** The cup the camera is zoomed to in first-person, or null for the diorama. */
  firstPersonLetter: string | null
  /** Why the core rejected the Player's last command, if it did. */
  rejection: string | null
  /** Seats an NPC Cupper in the next free Seat, or stands them up if already seated. */
  toggleLineup(npcId: string): void
  /** Starts an Attempt with the chosen Lineup. */
  startAttempt(): void
  setSpeed(speed: Speed): void
  selectCup(letter: string): void
  performStep(step: CuppingStep): void
  /** Rates an Attribute on the selected Blind Cup's Score Card. */
  setRating(attribute: Attribute, rating: number): void
  submit(): void
  /** Returns to the Lineup screen for a fresh Attempt of the same Cupping Session after the Reveal. */
  cupAgain(): void
  returnToDiorama(): void
  /** Passes elapsed real time to the core as a game-time step; the core decides what it means. */
  tick(realSeconds: number): void
}

let returnTimer: ReturnType<typeof setTimeout> | undefined

/** Runs a core command, returning the core's reason if it rejected it. */
function tryCommand(command: () => void): string | null {
  try {
    command()
    return null
  } catch (error) {
    if (!(error instanceof GameRuleError)) throw error
    return error.message
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  lineupOptions: core.getLineupOptions(firstSession.id),
  lineup: [],
  attempt: null,
  reveal: null,
  speed: 1,
  selectedLetter: firstSession.cups[0]!.letter,
  firstPersonLetter: null,
  rejection: null,
  toggleLineup(npcId) {
    const { lineup } = get()
    set({ lineup: lineup.includes(npcId) ? lineup.filter((id) => id !== npcId) : [...lineup, npcId], rejection: null })
  },
  startAttempt() {
    const rejection = tryCommand(() => core.startAttempt(firstSession.id, get().lineup))
    if (rejection) return set({ rejection })
    set({ attempt: core.getAttempt()!, selectedLetter: firstSession.cups[0]!.letter, rejection: null })
  },
  setSpeed: (speed) => set({ speed }),
  selectCup(letter) {
    clearTimeout(returnTimer)
    set({ selectedLetter: letter, firstPersonLetter: null, rejection: null })
  },
  performStep(step) {
    const letter = get().selectedLetter
    const rejection = tryCommand(() => core.performStep(letter, step))
    if (rejection) return set({ rejection })
    clearTimeout(returnTimer)
    returnTimer = setTimeout(() => get().returnToDiorama(), FIRST_PERSON_REAL_SECONDS * 1000)
    set({ attempt: core.getAttempt()!, firstPersonLetter: letter, rejection: null })
  },
  setRating(attribute, rating) {
    const rejection = tryCommand(() => core.setRating(get().selectedLetter, attribute, rating))
    set(rejection ? { rejection } : { attempt: core.getAttempt()!, rejection: null })
  },
  submit() {
    let reveal: RevealResult | undefined
    const rejection = tryCommand(() => {
      reveal = core.submit()
    })
    if (rejection) return set({ rejection })
    clearTimeout(returnTimer)
    set({ reveal, firstPersonLetter: null, rejection: null })
  },
  cupAgain() {
    set({ lineupOptions: core.getLineupOptions(firstSession.id), attempt: null, reveal: null, rejection: null })
  },
  returnToDiorama() {
    clearTimeout(returnTimer)
    set({ firstPersonLetter: null })
  },
  tick(realSeconds) {
    // The clock only runs during an Attempt: not while choosing a Lineup, nor once the Player has Submitted.
    if (!get().attempt || get().reveal) return
    core.advanceClock(Math.min(Math.max(realSeconds, 0), MAX_REAL_STEP_SECONDS) * get().speed)
    set({ attempt: core.getAttempt()! })
  },
}))
