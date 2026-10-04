import { describe, expect, it } from 'vitest'
import { makeTestContent } from '../content/testContent'
import { ATTRIBUTES, createGameCore, createMemorySaveStore, createSeededRandom, GameRuleError } from '.'
import type { Attribute, Rating } from '.'

const SESSION = 'lab-1-session-1'

function newGame(coolingOverrides = {}) {
  return createGameCore({
    content: makeTestContent(coolingOverrides),
    saveStore: createMemorySaveStore(),
    random: createSeededRandom(1),
  })
}

function startedGame(session = SESSION) {
  const game = newGame()
  game.startAttempt(session)
  return game
}

/** Rates each listed Attribute on each listed cup's Score Card. */
function rateAll(game: ReturnType<typeof newGame>, cards: Record<string, Partial<Record<Attribute, number>>>) {
  for (const [letter, card] of Object.entries(cards)) {
    for (const [attribute, rating] of Object.entries(card)) game.setRating(letter, attribute as Attribute, rating!)
  }
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

  it('starts every Blind Cup with no Cupping Steps done and an empty Cue Log', () => {
    const game = startedGame()

    expect(game.getAttempt()!.cups.map((c) => [c.completedSteps, c.cues])).toEqual([
      [[], []],
      [[], []],
      [[], []],
    ])
  })

  it('Dry Fragrance on a fresh cup adds an Aroma cue to its Cue Log', () => {
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

describe('Score Cards', () => {
  function scoreCard(game: ReturnType<typeof newGame>, letter: string) {
    return game.getAttempt()!.cups.find((c) => c.letter === letter)!.scoreCard
  }

  it('starts every Blind Cup with an empty Score Card', () => {
    const game = startedGame()

    expect(game.getAttempt()!.cups.map((c) => c.scoreCard)).toEqual([{}, {}, {}])
  })

  it('lets the Player rate Attributes on any cup in any order, and revise a rating', () => {
    const game = startedGame()

    game.setRating('C', 'body', 2)
    game.setRating('A', 'acidity', 5)
    game.setRating('C', 'aroma', 4)
    game.setRating('A', 'acidity', 3)

    expect(scoreCard(game, 'A')).toEqual({ acidity: 3 })
    expect(scoreCard(game, 'B')).toEqual({})
    expect(scoreCard(game, 'C')).toEqual({ body: 2, aroma: 4 })
  })

  it.each([0, 6, -1, 2.5, Number.NaN])('rejects a rating of %s, leaving the Score Card unchanged', (rating) => {
    const game = startedGame()
    game.setRating('A', 'flavor', 4)

    expect(() => game.setRating('A', 'flavor', rating)).toThrow(GameRuleError)
    expect(() => game.setRating('A', 'flavor', rating)).toThrow(/1.*5.*cups/)
    expect(scoreCard(game, 'A')).toEqual({ flavor: 4 })
  })

  it('accepts every whole rating from 1 to 5 cups', () => {
    const game = startedGame()

    for (const rating of [1, 2, 3, 4, 5]) game.setRating('B', 'sweetness', rating)

    expect(scoreCard(game, 'B')).toEqual({ sweetness: 5 })
  })

  it('rejects rating a cup letter that is not on the table', () => {
    expect(() => startedGame().setRating('Z', 'aroma', 3)).toThrow(/no Cup Z/i)
  })

  it('rejects rating when no Attempt is in progress', () => {
    expect(() => newGame().setRating('A', 'aroma', 3)).toThrow(/no Attempt/i)
  })
})

describe('Submit', () => {
  const PERFECT = {
    A: { aroma: 4, flavor: 3, acidity: 4, body: 2, sweetness: 3 },
    B: { aroma: 2, flavor: 5, acidity: 1, body: 5, sweetness: 4 },
    C: { aroma: 3, flavor: 3, acidity: 3, body: 3, sweetness: 3 },
  } as const

  it('is unavailable until every Attribute on every Blind Cup is rated', () => {
    const game = startedGame()
    expect(game.getAttempt()!.canSubmit).toBe(false)

    rateAll(game, { A: PERFECT.A, B: PERFECT.B, C: { aroma: 3, flavor: 3, acidity: 3, body: 3 } })
    expect(game.getAttempt()!.canSubmit).toBe(false)
    expect(game.getAttempt()!.cups.map((cup) => cup.scoreCardComplete)).toEqual([true, true, false])

    game.setRating('C', 'sweetness', 1)
    expect(game.getAttempt()!.canSubmit).toBe(true)
    expect(game.getAttempt()!.cups.map((cup) => cup.scoreCardComplete)).toEqual([true, true, true])
  })

  it('is rejected with gaps, naming the unrated Attributes, and the Attempt carries on', () => {
    const game = startedGame()
    rateAll(game, { A: PERFECT.A, B: { aroma: 2, flavor: 5, acidity: 1, body: 5 }, C: { aroma: 3 } })

    expect(() => game.submit()).toThrow(GameRuleError)
    expect(() => game.submit()).toThrow(/Cup B: Sweetness.*Cup C: Flavor, Acidity, Body, Sweetness/)
    expect(game.getAttempt()!.cups[0]!.scoreCard).toEqual(PERFECT.A)
  })

  it('is rejected when no Attempt is in progress', () => {
    expect(() => newGame().submit()).toThrow(/no Attempt/i)
  })

  it('reveals each coffee\'s origin and story, its Reference Score and the Player\'s Score Card', () => {
    const game = startedGame()
    rateAll(game, { A: PERFECT.A, B: { ...PERFECT.B, body: 1 }, C: PERFECT.C })

    const reveal = game.submit()

    expect(reveal.cups.map(({ letter, origin, story, referenceScore, scoreCard }) => ({ letter, origin, story, referenceScore, scoreCard }))).toEqual([
      { letter: 'A', origin: 'Origin A', story: 'Story of A', referenceScore: PERFECT.A, scoreCard: PERFECT.A },
      { letter: 'B', origin: 'Origin B', story: 'Story of B', referenceScore: PERFECT.B, scoreCard: { ...PERFECT.B, body: 1 } },
      { letter: 'C', origin: 'Origin C', story: 'Story of C', referenceScore: PERFECT.C, scoreCard: PERFECT.C },
    ])
  })

  it('happens once: it ends the Attempt, so Score Cards can no longer change', () => {
    const game = startedGame()
    rateAll(game, PERFECT)

    game.submit()

    expect(game.getAttempt()).toBeUndefined()
    expect(() => game.setRating('A', 'aroma', 1)).toThrow(/no Attempt/i)
    expect(() => game.submit()).toThrow(/no Attempt/i)
  })
})

describe('Calibration at the Reveal', () => {
  function revealFor(cards: Record<string, Partial<Record<Attribute, number>>>, session = SESSION) {
    const game = startedGame(session)
    rateAll(game, cards)
    return game.submit()
  }

  // Reference Scores: A 4/3/4/2/3, B 2/5/1/5/4, C 3/3/3/3/3 (Aroma/Flavor/Acidity/Body/Sweetness).
  it('earns 3 Calibration Points for an exact match, 1 for off by one either way, and 0 otherwise', () => {
    const reveal = revealFor({
      A: { aroma: 4, flavor: 4, acidity: 2, body: 1, sweetness: 5 },
      B: { aroma: 2, flavor: 1, acidity: 4, body: 5, sweetness: 4 },
      C: { aroma: 3, flavor: 3, acidity: 3, body: 3, sweetness: 3 },
    })

    expect(reveal.cups.map((cup) => cup.calibrationPoints)).toEqual([
      { aroma: 3, flavor: 1, acidity: 0, body: 1, sweetness: 0 },
      { aroma: 3, flavor: 0, acidity: 0, body: 3, sweetness: 3 },
      { aroma: 3, flavor: 3, acidity: 3, body: 3, sweetness: 3 },
    ])
    expect(reveal.calibrationPoints).toBe(5 + 9 + 15)
    expect(reveal.maxCalibrationPoints).toBe(45)
  })

  /**
   * Rates a session so the Player earns exactly `exact` exact matches and `offByOne` near-misses,
   * with every other Attribute off by two (0 points). Attributes are filled cup by cup in Score Card order.
   */
  function revealWith(session: string, exact: number, offByOne: number) {
    const cups = makeTestContent().labs.flatMap((lab) => lab.sessions).find((s) => s.id === session)!.cups
    let rated = 0
    const cards = Object.fromEntries(
      cups.map((cup) => [
        cup.letter,
        Object.fromEntries(
          ATTRIBUTES.map((attribute) => {
            const reference: Rating = cup.referenceScore[attribute]
            const offBy = rated < exact ? 0 : rated < exact + offByOne ? 1 : 2
            rated++
            return [attribute, reference + offBy <= 5 ? reference + offBy : reference - offBy]
          }),
        ),
      ]),
    )
    return revealFor(cards, session)
  }

  const FOUR_CUPS = 'lab-2-session-1' // 20 Attributes, 60 Calibration Points at most

  it.each([
    { exact: 0, offByOne: 0, points: 0, share: '0%', stars: 0 },
    { exact: 9, offByOne: 2, points: 29, share: 'just under 50%', stars: 0 },
    { exact: 10, offByOne: 0, points: 30, share: 'exactly 50%', stars: 1 },
    { exact: 13, offByOne: 2, points: 41, share: 'just under 70%', stars: 1 },
    { exact: 14, offByOne: 0, points: 42, share: 'exactly 70%', stars: 2 },
    { exact: 17, offByOne: 2, points: 53, share: 'just under 90%', stars: 2 },
    { exact: 18, offByOne: 0, points: 54, share: 'exactly 90%', stars: 3 },
    { exact: 20, offByOne: 0, points: 60, share: '100%', stars: 3 },
  ])('$points of 60 Calibration Points ($share) earns $stars Stars', ({ exact, offByOne, points, stars }) => {
    const reveal = revealWith(FOUR_CUPS, exact, offByOne)

    expect(reveal.calibrationPoints).toBe(points)
    expect(reveal.maxCalibrationPoints).toBe(60)
    expect(reveal.stars).toBe(stars)
  })

  it('sets Stars by share of the maximum, not by points alone: 22 of 45 is under half, 23 of 45 is over', () => {
    expect(revealWith(SESSION, 7, 1)).toMatchObject({ calibrationPoints: 22, maxCalibrationPoints: 45, stars: 0 })
    expect(revealWith(SESSION, 7, 2)).toMatchObject({ calibrationPoints: 23, maxCalibrationPoints: 45, stars: 1 })
  })
})
