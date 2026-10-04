import { describe, expect, it } from 'vitest'
import { createMemorySaveStore, createSeededRandom } from '.'

describe('seeded random source', () => {
  it('repeats the same sequence for the same seed, in [0, 1)', () => {
    const a = createSeededRandom(42)
    const b = createSeededRandom(42)
    const sequence = Array.from({ length: 5 }, () => a.next())

    expect(Array.from({ length: 5 }, () => b.next())).toEqual(sequence)
    expect(sequence.every((n) => n >= 0 && n < 1)).toBe(true)
    expect(createSeededRandom(43).next()).not.toBe(sequence[0])
  })
})

describe('in-memory save store', () => {
  it('returns nothing until saved, then what was saved', () => {
    const store = createMemorySaveStore()
    expect(store.load()).toBeNull()

    store.save('progress')

    expect(store.load()).toBe('progress')
  })
})
