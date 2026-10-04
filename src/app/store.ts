import { create } from 'zustand'
import { content, firstSession } from '../content/v1'
import { createGameCore } from '../core'
import type { AttemptState } from '../core'
import { createLocalStorageSaveStore } from './localStorageSaveStore'

export const SPEEDS = [1, 2, 4, 8] as const
export type Speed = (typeof SPEEDS)[number]

// Real frames longer than this (e.g. a backgrounded tab) are clamped so cups don't jump to cold.
// The first frame's delta can be slightly negative (the frame timestamp predates the loop starting).
const MAX_REAL_STEP_SECONDS = 0.1

const core = createGameCore({
  content,
  saveStore: createLocalStorageSaveStore(),
  random: { next: Math.random },
})
core.startAttempt(firstSession.id)

interface GameStore {
  attempt: AttemptState
  speed: Speed
  setSpeed(speed: Speed): void
  /** Passes elapsed real time to the core as a game-time step; the core decides what it means. */
  tick(realSeconds: number): void
}

export const useGameStore = create<GameStore>((set, get) => ({
  attempt: core.getAttempt()!,
  speed: 1,
  setSpeed: (speed) => set({ speed }),
  tick(realSeconds) {
    core.advanceClock(Math.min(Math.max(realSeconds, 0), MAX_REAL_STEP_SECONDS) * get().speed)
    set({ attempt: core.getAttempt()! })
  },
}))
