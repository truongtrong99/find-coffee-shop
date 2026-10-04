import { describe, expect, it } from 'vitest'
import { makeTestContent } from '../content/testContent'
import { createGameCore, createMemorySaveStore, createSeededRandom, GameRuleError } from '.'

const SESSION = 'lab-1-session-1'

function newGame(coolingOverrides = {}) {
  return createGameCore({
    content: makeTestContent(coolingOverrides),
    saveStore: createMemorySaveStore(),
    random: createSeededRandom(1),
  })
}

describe('starting an Attempt', () => {
  it('puts every Blind Cup on the table, labelled by letter, at the same starting Cup Temperature', () => {
    const game = newGame()

    game.startAttempt(SESSION)

    const attempt = game.getAttempt()
    expect(attempt?.cups.map((cup) => cup.letter)).toEqual(['A', 'B', 'C'])
    expect(attempt?.cups.map((cup) => cup.temperature)).toEqual([90, 90, 90])
  })
})

describe('Cup Temperature over game time', () => {
  it('falls monotonically from hot to the stone cold temperature over the tuned cooling time', () => {
    const game = newGame()
    game.startAttempt(SESSION)

    const readings: number[] = []
    for (let second = 0; second < 240; second += 30) {
      readings.push(game.getAttempt()!.cups[0]!.temperature)
      game.advanceClock(30)
    }
    readings.push(game.getAttempt()!.cups[0]!.temperature)

    expect(readings[0]).toBe(90)
    expect([...readings].sort((a, b) => b - a)).toEqual(readings)
    expect(new Set(readings).size).toBe(readings.length)
    expect(readings.at(-1)).toBeCloseTo(30, 6)
  })

  it('cools along a smooth curve towards room temperature (worked example: 120s of 240s)', () => {
    const game = newGame()
    game.startAttempt(SESSION)

    game.advanceClock(120)

    // 20 + 70 / sqrt(7), worked by hand from 90 -> 30 in 240s towards 20.
    expect(game.getAttempt()!.cups[0]!.temperature).toBeCloseTo(46.4575, 3)
  })

  it('cools every Blind Cup together', () => {
    const game = newGame()
    game.startAttempt(SESSION)

    game.advanceClock(60)

    const temperatures = game.getAttempt()!.cups.map((cup) => cup.temperature)
    expect(new Set(temperatures).size).toBe(1)
    expect(temperatures[0]).toBeLessThan(90)
  })

  it('follows the tuned cooling time rather than a fixed one', () => {
    const game = newGame({ secondsToStoneCold: 300 })
    game.startAttempt(SESSION)

    game.advanceClock(300)

    expect(game.getAttempt()!.cups[0]!.temperature).toBeCloseTo(30, 6)
  })

  it('reports the elapsed game time', () => {
    const game = newGame()
    game.startAttempt(SESSION)

    game.advanceClock(10)
    game.advanceClock(5)

    expect(game.getAttempt()!.elapsedSeconds).toBe(15)
  })
})

describe('speed-up', () => {
  // Speed-up is the presentation passing larger steps: one real second at Nx is an N-second step.
  function temperatureAfterRealSeconds(realSeconds: number, speed: number) {
    const game = newGame()
    game.startAttempt(SESSION)
    for (let second = 0; second < realSeconds; second++) game.advanceClock(1 * speed)
    return game.getAttempt()!.cups[0]!.temperature
  }

  it('cools proportionally faster: 30 real seconds at 4x equals 120 real seconds at 1x', () => {
    expect(temperatureAfterRealSeconds(30, 4)).toBeCloseTo(temperatureAfterRealSeconds(120, 1), 9)
  })

  it('does not depend on how the same game time is split into steps', () => {
    const oneStep = newGame()
    oneStep.startAttempt(SESSION)
    oneStep.advanceClock(90)

    expect(temperatureAfterRealSeconds(90, 1)).toBeCloseTo(oneStep.getAttempt()!.cups[0]!.temperature, 9)
  })
})

describe('rejecting commands that break the rules', () => {
  it('has no Attempt before one is started', () => {
    expect(newGame().getAttempt()).toBeUndefined()
  })

  it('rejects starting an unknown Cupping Session', () => {
    expect(() => newGame().startAttempt('nope')).toThrow(GameRuleError)
    expect(() => newGame().startAttempt('nope')).toThrow(/unknown Cupping Session/i)
  })

  it('rejects advancing the clock when no Attempt is in progress', () => {
    expect(() => newGame().advanceClock(1)).toThrow(/no Attempt/i)
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects advancing the clock by %s seconds', (seconds) => {
    const game = newGame()
    game.startAttempt(SESSION)

    expect(() => game.advanceClock(seconds)).toThrow(GameRuleError)
  })

  it('rejects cooling tuning that cannot produce a cooling curve', () => {
    expect(() => newGame({ stoneColdTemperature: 95 })).toThrow(/cooling/i)
    expect(() => newGame({ ambientTemperature: 30 })).toThrow(/cooling/i)
    expect(() => newGame({ secondsToStoneCold: 0 })).toThrow(/cooling/i)
  })
})

describe('Cupping Steps and Tasting Cues', () => {
  function cup(game: ReturnType<typeof newGame>, letter: string) {
    return game.getAttempt()!.cups.find((c) => c.letter === letter)!
  }

  function startedGame() {
    const game = newGame()
    game.startAttempt(SESSION)
    return game
  }

  it('starts every Blind Cup with no Cupping Steps done and an empty cue log', () => {
    const game = startedGame()

    expect(game.getAttempt()!.cups.map((c) => [c.completedSteps, c.cues])).toEqual([
      [[], []],
      [[], []],
      [[], []],
    ])
  })

  it('Dry Fragrance on a fresh cup adds an Aroma cue to its cue log', () => {
    const game = startedGame()

    game.performStep('A', 'dry-fragrance')

    expect(cup(game, 'A').completedSteps).toEqual(['dry-fragrance'])
    expect(cup(game, 'A').cues).toEqual([{ step: 'dry-fragrance', attribute: 'aroma', note: 'aroma 4: floral' }])
  })

  it('rejects a step out of order with a reason naming the next valid step, leaving the cup unchanged', () => {
    const game = startedGame()

    expect(() => game.performStep('A', 'slurp')).toThrow(GameRuleError)
    expect(() => game.performStep('A', 'slurp')).toThrow(/Cup A.*Slurp.*next.*Dry Fragrance or Pour/)
    expect(cup(game, 'A').completedSteps).toEqual([])
    expect(cup(game, 'A').cues).toEqual([])
  })

  it('rejects Dry Fragrance once the cup has been poured', () => {
    const game = startedGame()
    game.performStep('A', 'pour')

    expect(() => game.performStep('A', 'dry-fragrance')).toThrow(/Dry Fragrance.*before Pour.*next.*Break the Crust/)
    expect(cup(game, 'A').completedSteps).toEqual(['pour'])
  })

  it('rejects repeating a step other than Slurp', () => {
    const game = startedGame()
    game.performStep('A', 'dry-fragrance')

    expect(() => game.performStep('A', 'dry-fragrance')).toThrow(/next.*Pour/)
    expect(cup(game, 'A').cues).toHaveLength(1)
  })

  it('Pour, Break the Crust and Skim work in order, and only Break the Crust adds a cue: the same Aroma note', () => {
    const game = startedGame()
    game.performStep('A', 'dry-fragrance')

    game.performStep('A', 'pour')
    game.performStep('A', 'break-the-crust')
    game.performStep('A', 'skim')

    expect(cup(game, 'A').completedSteps).toEqual(['dry-fragrance', 'pour', 'break-the-crust', 'skim'])
    expect(cup(game, 'A').cues).toEqual([
      { step: 'dry-fragrance', attribute: 'aroma', note: 'aroma 4: floral' },
      { step: 'break-the-crust', attribute: 'aroma', note: 'aroma 4: floral' },
    ])
  })

  it('lets the Player skip Dry Fragrance and start with Pour', () => {
    const game = startedGame()

    game.performStep('A', 'pour')

    expect(cup(game, 'A').completedSteps).toEqual(['pour'])
    expect(cup(game, 'A').cues).toEqual([])
  })

  function skimmed(game: ReturnType<typeof newGame>, letter: string) {
    for (const step of ['pour', 'break-the-crust', 'skim'] as const) game.performStep(letter, step)
  }

  it('a Slurp after Skim gives a cue for every Attribute, noted from the Reference Score', () => {
    const game = startedGame()
    skimmed(game, 'B')

    game.performStep('B', 'slurp')

    expect(cup(game, 'B').cues).toEqual([
      { step: 'break-the-crust', attribute: 'aroma', note: 'aroma 2: faint' },
      { step: 'slurp', attribute: 'aroma', note: 'aroma 2: faint' },
      { step: 'slurp', attribute: 'flavor', note: 'flavor 5: layered berries' },
      { step: 'slurp', attribute: 'acidity', note: 'acidity 1: flat' },
      { step: 'slurp', attribute: 'body', note: 'body 5: syrupy' },
      { step: 'slurp', attribute: 'sweetness', note: 'sweetness 4: honeyed' },
    ])
  })

  it('Slurp can be repeated, and each Slurp adds another cue for every Attribute', () => {
    const game = startedGame()
    skimmed(game, 'C')

    game.performStep('C', 'slurp')
    game.performStep('C', 'slurp')
    game.performStep('C', 'slurp')

    expect(cup(game, 'C').completedSteps).toEqual(['pour', 'break-the-crust', 'skim', 'slurp', 'slurp', 'slurp'])
    expect(cup(game, 'C').cues.filter((c) => c.step === 'slurp')).toHaveLength(15)
    expect(cup(game, 'C').cues.filter((c) => c.attribute === 'acidity').map((c) => c.note)).toEqual([
      'acidity 3: apple',
      'acidity 3: apple',
      'acidity 3: apple',
    ])
  })

  it('tracks steps and cues per cup, so cupping one Blind Cup leaves the others untouched', () => {
    const game = startedGame()
    game.performStep('A', 'dry-fragrance')
    skimmed(game, 'A')
    game.performStep('A', 'slurp')

    expect(cup(game, 'B').completedSteps).toEqual([])
    expect(cup(game, 'B').cues).toEqual([])
    expect(cup(game, 'C').cues).toEqual([])

    game.performStep('B', 'dry-fragrance')

    expect(cup(game, 'B').cues).toEqual([{ step: 'dry-fragrance', attribute: 'aroma', note: 'aroma 2: faint' }])
    expect(cup(game, 'A').cues).toHaveLength(7)
  })

  it('rejects a Cupping Step on a cup letter that is not on the table', () => {
    const game = startedGame()

    expect(() => game.performStep('Z', 'dry-fragrance')).toThrow(GameRuleError)
    expect(() => game.performStep('Z', 'dry-fragrance')).toThrow(/no Cup Z/i)
  })

  it('rejects a Cupping Step when no Attempt is in progress', () => {
    expect(() => newGame().performStep('A', 'dry-fragrance')).toThrow(/no Attempt/i)
  })
})
