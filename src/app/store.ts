import { create } from 'zustand'
import { content, firstSession } from '../content/v1'
import { createGameCore, GameRuleError } from '../core'
import type { AttemptState, CuppingStep } from '../core'
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
core.startAttempt(firstSession.id)

interface GameStore {
  attempt: AttemptState
  speed: Speed
  /** The Blind Cup the Player is looking at; they may move between cups freely. */
  selectedLetter: string
  /** The cup the camera is zoomed to in first-person, or null for the diorama. */
  firstPersonLetter: string | null
  /** Why the core rejected the Player's last Cupping Step, if it did. */
  stepRejection: string | null
  setSpeed(speed: Speed): void
  selectCup(letter: string): void
  performStep(step: CuppingStep): void
  returnToDiorama(): void
  /** Passes elapsed real time to the core as a game-time step; the core decides what it means. */
  tick(realSeconds: number): void
}

let returnTimer: ReturnType<typeof setTimeout> | undefined

export const useGameStore = create<GameStore>((set, get) => ({
  attempt: core.getAttempt()!,
  speed: 1,
  selectedLetter: firstSession.cups[0]!.letter,
  firstPersonLetter: null,
  stepRejection: null,
  setSpeed: (speed) => set({ speed }),
  selectCup(letter) {
    clearTimeout(returnTimer)
    set({ selectedLetter: letter, firstPersonLetter: null, stepRejection: null })
  },
  performStep(step) {
    const letter = get().selectedLetter
    try {
      core.performStep(letter, step)
    } catch (error) {
      if (!(error instanceof GameRuleError)) throw error
      set({ stepRejection: error.message })
      return
    }
    clearTimeout(returnTimer)
    returnTimer = setTimeout(() => get().returnToDiorama(), FIRST_PERSON_REAL_SECONDS * 1000)
    set({ attempt: core.getAttempt()!, firstPersonLetter: letter, stepRejection: null })
  },
  returnToDiorama() {
    clearTimeout(returnTimer)
    set({ firstPersonLetter: null })
  },
  tick(realSeconds) {
    core.advanceClock(Math.min(Math.max(realSeconds, 0), MAX_REAL_STEP_SECONDS) * get().speed)
    set({ attempt: core.getAttempt()! })
  },
}))
