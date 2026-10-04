/** Persists the Player's progress as an opaque serialized string. */
export interface SaveStore {
  load(): string | null
  save(serialized: string): void
}

/** Source of randomness; seeded in tests so every run is reproducible. */
export interface RandomSource {
  /** A number in [0, 1). */
  next(): number
}
