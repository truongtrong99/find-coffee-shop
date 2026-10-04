import { describe, expect, it } from 'vitest'
import { makeTestContent } from '../content/testContent'
import type { TestTuningOverrides } from '../content/testContent'
import { ATTRIBUTES, createGameCore, createMemorySaveStore, createSeededRandom, GameRuleError } from '.'
import type { Attribute, Rating } from '.'

const SESSION = 'lab-1-session-1'

function newGame(tuning: TestTuningOverrides = {}, seed = 1) {
  return createGameCore({
    content: makeTestContent(tuning),
    saveStore: createMemorySaveStore(),
    random: createSeededRandom(seed),
  })
}

function startedGame(session = SESSION) {
  const game = newGame()
  game.startAttempt(session, [])
  return game
}

/** The current state of the Blind Cup with this letter. */
function cup(game: ReturnType<typeof newGame>, letter: string) {
  return game.getAttempt()!.cups.find((c) => c.letter === letter)!
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

    game.startAttempt(SESSION, [])

    const attempt = game.getAttempt()
    expect(attempt?.cups.map((cup) => cup.letter)).toEqual(['A', 'B', 'C'])
    expect(attempt?.cups.map((cup) => cup.temperature)).toEqual([90, 90, 90])
  })
})

describe('choosing a Lineup', () => {
  it('offers the unlocked NPC Cuppers and the Lab\'s Seat count', () => {
    expect(newGame().getLineupOptions(SESSION)).toEqual({
      seats: 2,
      npcCuppers: [
        { id: 'pip', name: 'Pip' },
        { id: 'mochi', name: 'Mochi' },
        { id: 'juniper', name: 'Juniper' },
      ],
    })
    expect(newGame().getLineupOptions('lab-2-session-1').seats).toBe(4)
  })

  it('seats the Lineup\'s NPC Cuppers at the table, in Lineup order', () => {
    const game = newGame()

    game.startAttempt(SESSION, ['mochi', 'pip'])

    expect(game.getAttempt()!.npcCuppers.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: 'mochi', name: 'Mochi' },
      { id: 'pip', name: 'Pip' },
    ])
  })

  it('allows leaving Seats empty, even all of them', () => {
    const one = newGame()
    one.startAttempt(SESSION, ['juniper'])
    const none = newGame()
    none.startAttempt(SESSION, [])

    expect(one.getAttempt()!.npcCuppers.map((npc) => npc.id)).toEqual(['juniper'])
    expect(none.getAttempt()!.npcCuppers).toEqual([])
  })

  it.each([
    { lineup: ['pip', 'biscuit'], reason: /Biscuit.*locked/ },
    { lineup: ['pip', 'pip'], reason: /Pip.*one Seat/ },
    { lineup: ['pip', 'mochi', 'juniper'], reason: /3 NPC Cuppers.*2 Seats/ },
    { lineup: ['nobody'], reason: /no NPC Cupper "nobody"/ },
  ])('rejects the Lineup $lineup without starting an Attempt', ({ lineup, reason }) => {
    const game = newGame()

    expect(() => game.startAttempt(SESSION, lineup)).toThrow(GameRuleError)
    expect(() => game.startAttempt(SESSION, lineup)).toThrow(reason)
    expect(game.getAttempt()).toBeUndefined()
  })

  it('says why a Lineup would be rejected before the Attempt starts, or nothing when it fits', () => {
    const game = newGame()

    expect(game.checkLineup(SESSION, ['pip', 'mochi', 'juniper'])).toMatch(/3 NPC Cuppers.*2 Seats/)
    expect(game.checkLineup(SESSION, ['biscuit'])).toMatch(/Biscuit.*locked/)
    expect(game.checkLineup(SESSION, ['pip', 'mochi'])).toBeUndefined()
    expect(game.checkLineup(SESSION, [])).toBeUndefined()
    expect(game.getAttempt()).toBeUndefined()
  })

  it('fills up to the Seat count in a Lab with more Seats', () => {
    const game = newGame()

    game.startAttempt('lab-2-session-1', ['pip', 'mochi', 'juniper'])

    expect(game.getAttempt()!.npcCuppers).toHaveLength(3)
  })
})

describe('NPC Cuppers cupping on their own schedules', () => {
  function seatedGame(...lineup: string[]) {
    const game = newGame()
    game.startAttempt(SESSION, lineup)
    return game
  }

  function stepsOf(game: ReturnType<typeof newGame>, npcId: string) {
    return game.getAttempt()!.npcCuppers.find((npc) => npc.id === npcId)!.steps
  }

  /** Steps as `letter step @ seconds`, so a whole schedule fits on a line. */
  function scheduleOf(game: ReturnType<typeof newGame>, npcId: string) {
    return stepsOf(game, npcId).map((s) => `${s.cupLetter} ${s.step} @ ${Math.round(s.atSeconds * 10) / 10}`)
  }

  it('have done nothing when the Attempt starts', () => {
    expect(stepsOf(seatedGame('pip', 'mochi'), 'pip')).toEqual([])
  })

  // Pip takes a Cupping Step every 5 game seconds and slurps at 70°C or cooler.
  it('perform each Cupping Step on every cup in turn, one at a time, as the clock advances', () => {
    const game = seatedGame('pip')

    game.advanceClock(4.9)
    expect(scheduleOf(game, 'pip')).toEqual([])

    game.advanceClock(15.1)
    expect(scheduleOf(game, 'pip')).toEqual([
      'A dry-fragrance @ 5',
      'B dry-fragrance @ 10',
      'C dry-fragrance @ 15',
      'A pour @ 20',
    ])

    game.advanceClock(100)
    expect(scheduleOf(game, 'pip').slice(4)).toEqual([
      'B pour @ 25',
      'C pour @ 30',
      'A break-the-crust @ 35',
      'B break-the-crust @ 40',
      'C break-the-crust @ 45',
      'A skim @ 50',
      'B skim @ 55',
      'C skim @ 60',
      // The cups have already cooled below 70°C (63°C at 60s), so impatient Pip slurps straight away.
      'A slurp @ 65',
      'B slurp @ 70',
      'C slurp @ 75',
    ])
  })

  it('record the Cup Temperature of every step, so a Slurp shows how hot the cup was', () => {
    const game = seatedGame('pip')

    game.advanceClock(75)

    const slurps = stepsOf(game, 'pip').filter((s) => s.step === 'slurp')
    // Worked from 90 -> 30 in 240s towards 20: 20 + 70 * 7^(-t/240).
    expect(slurps[0]!.temperature).toBeCloseTo(61.325, 3)
    expect(slurps[2]!.temperature).toBeCloseTo(58.107, 3)
  })

  // Mochi takes a step every 4 game seconds, so is skimmed by 48s, but waits for 50°C to slurp.
  it('a patient NPC Cupper waits for the cups to cool to their slurp temperature', () => {
    const game = seatedGame('mochi')

    game.advanceClock(104)
    expect(scheduleOf(game, 'mochi')).toHaveLength(12)
    expect(scheduleOf(game, 'mochi').at(-1)).toBe('C skim @ 48')

    game.advanceClock(20)
    // 50°C is reached at 240 * log7(70 / 30) = 104.5s.
    expect(scheduleOf(game, 'mochi').slice(12)).toEqual(['A slurp @ 104.5', 'B slurp @ 108.5', 'C slurp @ 112.5'])
    expect(stepsOf(game, 'mochi')[12]!.temperature).toBeCloseTo(50, 6)
  })

  // Juniper takes a step every 6 game seconds and slurps at 65°C, then again at 40°C.
  it('slurp every cup again at each cooler slurp temperature', () => {
    const game = seatedGame('juniper')

    game.advanceClock(200)

    // 40°C is reached at 240 * log7(70 / 20) = 154.5s.
    expect(scheduleOf(game, 'juniper').slice(12)).toEqual([
      'A slurp @ 78',
      'B slurp @ 84',
      'C slurp @ 90',
      'A slurp @ 154.5',
      'B slurp @ 160.5',
      'C slurp @ 166.5',
    ])
  })

  it('keep their own schedules side by side', () => {
    const game = seatedGame('pip', 'mochi')

    game.advanceClock(12)

    expect(scheduleOf(game, 'pip')).toEqual(['A dry-fragrance @ 5', 'B dry-fragrance @ 10'])
    expect(scheduleOf(game, 'mochi')).toEqual(['A dry-fragrance @ 4', 'B dry-fragrance @ 8', 'C dry-fragrance @ 12'])
  })

  it('do not depend on how the same game time is split into steps', () => {
    const oneStep = seatedGame('mochi')
    oneStep.advanceClock(130)
    const manySteps = seatedGame('mochi')
    for (let i = 0; i < 130; i++) manySteps.advanceClock(1)

    expect(stepsOf(manySteps, 'mochi')).toHaveLength(15)
    expect(stepsOf(manySteps, 'mochi').map((s) => s.atSeconds)).toEqual(stepsOf(oneStep, 'mochi').map((s) => s.atSeconds))
  })

  it('cup apart from the Player, leaving the Player\'s cups and Cue Logs untouched', () => {
    const game = seatedGame('pip')

    game.advanceClock(120)

    expect(game.getAttempt()!.cups.map((c) => [c.completedSteps, c.cues])).toEqual([
      [[], []],
      [[], []],
      [[], []],
    ])
    expect(() => game.performStep('A', 'pour')).not.toThrow()
  })
})

describe('Cup Temperature over game time', () => {
  it('falls monotonically from hot to the stone cold temperature over the tuned cooling time', () => {
    const game = newGame()
    game.startAttempt(SESSION, [])

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
    game.startAttempt(SESSION, [])

    game.advanceClock(120)

    // 20 + 70 / sqrt(7), worked by hand from 90 -> 30 in 240s towards 20.
    expect(game.getAttempt()!.cups[0]!.temperature).toBeCloseTo(46.4575, 3)
  })

  it('cools every Blind Cup together', () => {
    const game = newGame()
    game.startAttempt(SESSION, [])

    game.advanceClock(60)

    const temperatures = game.getAttempt()!.cups.map((cup) => cup.temperature)
    expect(new Set(temperatures).size).toBe(1)
    expect(temperatures[0]).toBeLessThan(90)
  })

  it('follows the tuned cooling time rather than a fixed one', () => {
    const game = newGame({ cooling: { secondsToStoneCold: 300 } })
    game.startAttempt(SESSION, [])

    game.advanceClock(300)

    expect(game.getAttempt()!.cups[0]!.temperature).toBeCloseTo(30, 6)
  })

  it('reports the elapsed game time', () => {
    const game = newGame()
    game.startAttempt(SESSION, [])

    game.advanceClock(10)
    game.advanceClock(5)

    expect(game.getAttempt()!.elapsedSeconds).toBe(15)
  })
})

describe('speed-up', () => {
  // Speed-up is the presentation passing larger steps: one real second at Nx is an N-second step.
  function temperatureAfterRealSeconds(realSeconds: number, speed: number) {
    const game = newGame()
    game.startAttempt(SESSION, [])
    for (let second = 0; second < realSeconds; second++) game.advanceClock(1 * speed)
    return game.getAttempt()!.cups[0]!.temperature
  }

  it('cools proportionally faster: 30 real seconds at 4x equals 120 real seconds at 1x', () => {
    expect(temperatureAfterRealSeconds(30, 4)).toBeCloseTo(temperatureAfterRealSeconds(120, 1), 9)
  })

  it('does not depend on how the same game time is split into steps', () => {
    const oneStep = newGame()
    oneStep.startAttempt(SESSION, [])
    oneStep.advanceClock(90)

    expect(temperatureAfterRealSeconds(90, 1)).toBeCloseTo(oneStep.getAttempt()!.cups[0]!.temperature, 9)
  })
})

describe('rejecting commands that break the rules', () => {
  it('has no Attempt before one is started', () => {
    expect(newGame().getAttempt()).toBeUndefined()
  })

  it('rejects starting an unknown Cupping Session', () => {
    expect(() => newGame().startAttempt('nope', [])).toThrow(GameRuleError)
    expect(() => newGame().startAttempt('nope', [])).toThrow(/unknown Cupping Session/i)
  })

  it('rejects advancing the clock when no Attempt is in progress', () => {
    expect(() => newGame().advanceClock(1)).toThrow(/no Attempt/i)
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects advancing the clock by %s seconds', (seconds) => {
    const game = newGame()
    game.startAttempt(SESSION, [])

    expect(() => game.advanceClock(seconds)).toThrow(GameRuleError)
  })

  it('rejects cooling tuning that cannot produce a cooling curve', () => {
    expect(() => newGame({ cooling: { stoneColdTemperature: 95 } })).toThrow(/cooling/i)
    expect(() => newGame({ cooling: { ambientTemperature: 30 } })).toThrow(/cooling/i)
    expect(() => newGame({ cooling: { secondsToStoneCold: 0 } })).toThrow(/cooling/i)
  })
})

describe('Cupping Steps and Tasting Cues', () => {

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
    expect(cup(game, 'A').cues).toMatchObject([{ step: 'dry-fragrance', attribute: 'aroma', note: 'aroma 4: floral' }])
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
    expect(cup(game, 'A').cues).toMatchObject([
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

  // Whether each cue is accurate depends on Cup Temperature: see 'Accuracy Windows for Tasting Cues'.
  it('a Slurp after Skim gives a cue for every Attribute, in Score Card order', () => {
    const game = startedGame()
    skimmed(game, 'B')

    game.performStep('B', 'slurp')

    expect(cup(game, 'B').cues).toMatchObject([
      { step: 'break-the-crust', attribute: 'aroma', note: 'aroma 2: faint' },
      { step: 'slurp', attribute: 'aroma', note: 'aroma 2: faint' },
      { step: 'slurp', attribute: 'flavor' },
      { step: 'slurp', attribute: 'acidity' },
      { step: 'slurp', attribute: 'body' },
      { step: 'slurp', attribute: 'sweetness' },
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
    expect(cup(game, 'C').cues.filter((c) => c.step === 'slurp' && c.attribute === 'aroma').map((c) => c.note)).toEqual([
      'aroma 3: nutty',
      'aroma 3: nutty',
      'aroma 3: nutty',
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

    expect(cup(game, 'B').cues).toMatchObject([{ step: 'dry-fragrance', attribute: 'aroma', note: 'aroma 2: faint' }])
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

describe('Accuracy Windows for Tasting Cues', () => {
  // Test windows: Aroma 70–90°C, Body 55–75, Flavor 40–80, Acidity 35–55, Sweetness 35–60; stone cold at 30.
  // The cups cool 90 -> 30 in 240s towards 20, so they are 90°C at 0s, 46.46°C at 120s and 26.15°C at 300s.
  // Reference Scores: A 4/3/4/2/3, B 2/5/1/5/4 (Aroma/Flavor/Acidity/Body/Sweetness).

  /** A game with every cup skimmed, the clock advanced to `seconds`, ready to Slurp. */
  function readyToSlurp(seconds: number, tuning: TestTuningOverrides = {}, seed = 1) {
    const game = newGame(tuning, seed)
    game.startAttempt(SESSION, [])
    for (const letter of ['A', 'B', 'C']) {
      for (const step of ['pour', 'break-the-crust', 'skim'] as const) game.performStep(letter, step)
    }
    game.advanceClock(seconds)
    return game
  }

  /** The cues of the cup's latest Cupping Step, by Attribute. */
  function latestCues(game: ReturnType<typeof newGame>, letter: string) {
    const cues = cup(game, letter).cues
    return Object.fromEntries(cues.slice(-ATTRIBUTES.length).map((cue) => [cue.attribute, cue]))
  }

  it('a Slurp inside an Attribute\'s Accuracy Window gives a cue noted from the Reference Score', () => {
    const game = readyToSlurp(120)

    game.performStep('A', 'slurp')

    const cues = latestCues(game, 'A')
    expect(cues.flavor).toEqual({
      step: 'slurp',
      attribute: 'flavor',
      note: 'flavor 3: cocoa',
      temperature: expect.closeTo(46.4575, 3),
      window: 'inside',
      suggestedRating: 3,
    })
    expect(cues.acidity).toMatchObject({ note: 'acidity 4: bright, lemony', window: 'inside', suggestedRating: 4 })
    expect(cues.sweetness).toMatchObject({ note: 'sweetness 3: caramel', window: 'inside', suggestedRating: 3 })
  })

  it('a Slurp outside an Attribute\'s window can give a vague cue, saying whether the cup was too hot or too cold', () => {
    const hot = readyToSlurp(0, { skewedCueChance: 0 })
    const cooling = readyToSlurp(120, { skewedCueChance: 0 })

    hot.performStep('A', 'slurp')
    cooling.performStep('A', 'slurp')

    expect(latestCues(hot, 'A').acidity).toEqual({
      step: 'slurp',
      attribute: 'acidity',
      note: 'acidity ?: hard to make out',
      temperature: 90,
      window: 'too-hot',
      suggestedRating: undefined,
    })
    expect(latestCues(hot, 'A').aroma).toMatchObject({ note: 'aroma 4: floral', window: 'inside' })
    expect(latestCues(cooling, 'A').aroma).toMatchObject({ note: 'aroma ?: hard to make out', window: 'too-cold', suggestedRating: undefined })
    expect(latestCues(cooling, 'A').body).toMatchObject({ note: 'body ?: hard to make out', window: 'too-cold', suggestedRating: undefined })
  })

  it('a Slurp outside an Attribute\'s window can give a cue skewed one cup off the Reference Score', () => {
    const game = readyToSlurp(0, { skewedCueChance: 1 })

    game.performStep('A', 'slurp')
    game.performStep('B', 'slurp')

    // Cup B's Acidity 1 and Body 5 can only be skewed one way.
    expect(latestCues(game, 'B').acidity).toMatchObject({ note: 'acidity 2: soft', window: 'too-hot', suggestedRating: 2 })
    expect(latestCues(game, 'B').body).toMatchObject({ note: 'body 4: creamy', window: 'too-hot', suggestedRating: 4 })
    // Cup A's Acidity 4 and Flavor 3 can be skewed either way.
    expect(['acidity 3: apple', 'acidity 5: sparkling']).toContain(latestCues(game, 'A').acidity!.note)
    expect([3, 5]).toContain(latestCues(game, 'A').acidity!.suggestedRating)
    expect(['flavor 2: muted', 'flavor 4: stone fruit']).toContain(latestCues(game, 'A').flavor!.note)
    // Aroma is inside its window at 90°C, so stays accurate.
    expect(latestCues(game, 'A').aroma).toMatchObject({ note: 'aroma 4: floral', window: 'inside', suggestedRating: 4 })
  })

  describe('with the seeded random source deciding vague or skewed', () => {
    const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1)

    /** Cup A's Acidity cue from a Slurp at 90°C, too hot for its window; Reference Score 4. */
    function hotAcidityCue(seed: number) {
      const game = readyToSlurp(0, { skewedCueChance: 0.5 }, seed)
      game.performStep('A', 'slurp')
      return latestCues(game, 'A').acidity!
    }

    it('is never accurate outside the window: always vague, or one cup off', () => {
      for (const seed of SEEDS) {
        expect([undefined, 3, 5]).toContain(hotAcidityCue(seed).suggestedRating)
      }
    })

    it('gives both vague and skewed cues across seeds, but repeats for the same seed', () => {
      const ratings = SEEDS.map((seed) => hotAcidityCue(seed).suggestedRating)

      expect(new Set(ratings)).toEqual(new Set([undefined, 3, 5]))
      expect(hotAcidityCue(7)).toEqual(hotAcidityCue(7))
    })
  })

  it('Break the Crust follows the Aroma window too, but Dry Fragrance smells the dry grounds and is always accurate', () => {
    const game = newGame({ skewedCueChance: 0 })
    game.startAttempt(SESSION, [])
    game.performStep('A', 'pour')
    game.advanceClock(120)

    game.performStep('B', 'dry-fragrance')
    game.performStep('A', 'break-the-crust')

    expect(cup(game, 'B').cues.at(-1)).toMatchObject({ step: 'dry-fragrance', note: 'aroma 2: faint', window: 'inside', suggestedRating: 2 })
    expect(cup(game, 'A').cues.at(-1)).toMatchObject({ step: 'break-the-crust', note: 'aroma ?: hard to make out', window: 'too-cold' })
  })

  it('returns the Tasting Cues a Cupping Step gave, as added to the Cue Log', () => {
    const game = readyToSlurp(120)

    const given = game.performStep('A', 'slurp')

    expect(given.map((cue) => cue.attribute)).toEqual(ATTRIBUTES)
    expect(given).toEqual(cup(game, 'A').cues.slice(-ATTRIBUTES.length))
    expect(game.performStep('B', 'slurp')).toHaveLength(ATTRIBUTES.length)
  })

  it('shows where each cup\'s current temperature sits against every Attribute\'s window, so Slurps can be timed', () => {
    const game = readyToSlurp(0)
    const windows = () => game.getAttempt()!.cups.map((c) => c.windows)

    expect(windows()[0]).toEqual({ aroma: 'inside', flavor: 'too-hot', acidity: 'too-hot', body: 'too-hot', sweetness: 'too-hot' })

    game.advanceClock(70) // 59.7°C: just inside Sweetness's window
    expect(windows()[0]).toEqual({ aroma: 'too-cold', flavor: 'inside', acidity: 'too-hot', body: 'inside', sweetness: 'inside' })

    game.advanceClock(50) // 46.46°C
    expect(windows()[0]).toEqual({ aroma: 'too-cold', flavor: 'inside', acidity: 'inside', body: 'too-cold', sweetness: 'inside' })

    expect(cup(game, 'A').stoneCold).toBe(false)

    game.advanceClock(180) // 26.15°C
    expect(new Set(Object.values(windows()[0]!))).toEqual(new Set(['stone-cold']))
    expect(new Set(windows().map((w) => JSON.stringify(w))).size).toBe(1)
    expect(game.getAttempt()!.cups.map((c) => c.stoneCold)).toEqual([true, true, true])
  })

  it('rejects an Accuracy Window whose coolest temperature is above its hottest', () => {
    expect(() => newGame({ accuracyWindows: { body: { min: 75, max: 55 } } })).toThrow(GameRuleError)
    expect(() => newGame({ accuracyWindows: { body: { min: 75, max: 55 } } })).toThrow(/Accuracy Window.*Body/)
  })

  it.each([-0.1, 1.5, Number.NaN])('rejects a skewed cue chance of %s, outside 0–1', (skewedCueChance) => {
    expect(() => newGame({ skewedCueChance })).toThrow(/skewed cue chance/i)
  })

  it('a stone-cold cup gives vague cues for every Attribute, even where a window reaches below stone cold', () => {
    const game = readyToSlurp(300, { skewedCueChance: 1, accuracyWindows: { acidity: { min: 20, max: 55 } } })

    game.performStep('B', 'slurp')

    expect(Object.values(latestCues(game, 'B'))).toEqual(
      ATTRIBUTES.map((attribute) => ({
        step: 'slurp',
        attribute,
        note: `${attribute} ?: hard to make out`,
        temperature: expect.closeTo(26.15, 2),
        window: 'stone-cold',
        suggestedRating: undefined,
      })),
    )
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

  it('leaves the Player\'s Calibration Points and Stars unaffected by NPC Score Cards', () => {
    const game = newGame()
    game.startAttempt(SESSION, ['pip', 'juniper'])
    rateAll(game, {
      A: { aroma: 4, flavor: 3, acidity: 4, body: 2, sweetness: 3 },
      B: { aroma: 2, flavor: 5, acidity: 1, body: 5, sweetness: 4 },
      C: { aroma: 3, flavor: 3, acidity: 3, body: 3, sweetness: 3 },
    })

    expect(game.submit()).toMatchObject({ calibrationPoints: 45, maxCalibrationPoints: 45, stars: 3 })
  })

  it('sets Stars by share of the maximum, not by points alone: 22 of 45 is under half, 23 of 45 is over', () => {
    expect(revealWith(SESSION, 7, 1)).toMatchObject({ calibrationPoints: 22, maxCalibrationPoints: 45, stars: 0 })
    expect(revealWith(SESSION, 7, 2)).toMatchObject({ calibrationPoints: 23, maxCalibrationPoints: 45, stars: 1 })
  })
})

describe('NPC Score Cards at the Reveal', () => {
  const PLAYER_CARDS = {
    A: { aroma: 3, flavor: 3, acidity: 3, body: 3, sweetness: 3 },
    B: { aroma: 3, flavor: 3, acidity: 3, body: 3, sweetness: 3 },
    C: { aroma: 3, flavor: 3, acidity: 3, body: 3, sweetness: 3 },
  }

  function revealWithLineup(lineup: string[], tuning: TestTuningOverrides = {}, seed = 1) {
    const game = newGame(tuning, seed)
    game.startAttempt(SESSION, lineup)
    rateAll(game, PLAYER_CARDS)
    return game.submit()
  }

  // Reference Scores: A 4/3/4/2/3, B 2/5/1/5/4, C 3/3/3/3/3 (Aroma/Flavor/Acidity/Body/Sweetness).
  // Pip: Acidity +2, Sweetness -1. Juniper: Aroma -3, Flavor +1. Worked by hand, kept within 1–5.
  const BIASED_CARDS = [
    [
      { id: 'pip', name: 'Pip', scoreCard: { aroma: 4, flavor: 3, acidity: 5, body: 2, sweetness: 2 } },
      { id: 'juniper', name: 'Juniper', scoreCard: { aroma: 1, flavor: 4, acidity: 4, body: 2, sweetness: 3 } },
    ],
    [
      { id: 'pip', name: 'Pip', scoreCard: { aroma: 2, flavor: 5, acidity: 3, body: 5, sweetness: 3 } },
      { id: 'juniper', name: 'Juniper', scoreCard: { aroma: 1, flavor: 5, acidity: 1, body: 5, sweetness: 4 } },
    ],
    [
      { id: 'pip', name: 'Pip', scoreCard: { aroma: 3, flavor: 3, acidity: 5, body: 3, sweetness: 2 } },
      { id: 'juniper', name: 'Juniper', scoreCard: { aroma: 1, flavor: 4, acidity: 3, body: 3, sweetness: 3 } },
    ],
  ] as const

  it('shows every NPC Cupper\'s Score Card beside the Player\'s: the Reference Score shifted by their Personality Bias', () => {
    const reveal = revealWithLineup(['pip', 'juniper'])

    expect(reveal.cups.map((cup) => cup.npcScoreCards)).toEqual(BIASED_CARDS)
    expect(reveal.cups[0]!.scoreCard).toEqual(PLAYER_CARDS.A)
  })

  it('has no NPC Score Cards when every Seat was left empty', () => {
    expect(revealWithLineup([]).cups.map((cup) => cup.npcScoreCards)).toEqual([[], [], []])
  })

  describe('with seeded noise', () => {
    const NOISE = { npcScoreNoise: 1 }
    const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1)

    it('scatters each rating by at most the noise around Reference Score plus bias, always within 1–5 cups', () => {
      for (const seed of SEEDS) {
        const reveal = revealWithLineup(['pip', 'juniper'], NOISE, seed)
        reveal.cups.forEach((cup, c) =>
          cup.npcScoreCards.forEach((npcCard, n) => {
            for (const attribute of ATTRIBUTES) {
              const rating = npcCard.scoreCard[attribute]
              expect([1, 2, 3, 4, 5]).toContain(rating)
              expect(Math.abs(rating - BIASED_CARDS[c]![n]!.scoreCard[attribute])).toBeLessThanOrEqual(1)
            }
          }),
        )
      }
    })

    it('varies with the seed, but repeats for the same seed', () => {
      const cards = (seed: number) => revealWithLineup(['pip', 'juniper'], NOISE, seed).cups.map((cup) => cup.npcScoreCards)

      expect(cards(7)).toEqual(cards(7))
      expect(new Set(SEEDS.map((seed) => JSON.stringify(cards(seed)))).size).toBeGreaterThan(1)
    })

    it('stays centred on the bias: Pip\'s Cup C Acidity averages near 5, Sweetness near 2, Body near 3', () => {
      const pipC = SEEDS.map((seed) => revealWithLineup(['pip'], NOISE, seed).cups[2]!.npcScoreCards[0]!.scoreCard)
      const mean = (attribute: Attribute) => pipC.reduce((sum, card) => sum + card[attribute], 0) / pipC.length

      expect(mean('acidity')).toBeGreaterThan(4.5)
      expect(mean('sweetness')).toBeGreaterThan(1.5)
      expect(mean('sweetness')).toBeLessThan(2.5)
      expect(mean('body')).toBeGreaterThan(2.5)
      expect(mean('body')).toBeLessThan(3.5)
    })
  })
})
