import type { RandomSource, SaveStore } from './ports'

export function createMemorySaveStore(initial: string | null = null): SaveStore {
  let stored = initial
  return {
    load: () => stored,
    save: (serialized) => {
      stored = serialized
    },
  }
}

/** Deterministic random source (mulberry32). */
export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0
      let t = state
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
  }
}
