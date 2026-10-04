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
