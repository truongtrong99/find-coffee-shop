import { GameRuleError } from './errors'
import type { CoolingTuning } from './types'

/**
 * Newton's law of cooling: the cup's excess over ambient decays exponentially.
 * The decay constant is derived so the cup reaches the stone cold temperature
 * after exactly `secondsToStoneCold`, which is the intuitive knob to tune.
 */
export function createCoolingCurve(tuning: CoolingTuning): (elapsedSeconds: number) => number {
  const { startTemperature, ambientTemperature, stoneColdTemperature, secondsToStoneCold } = tuning
  if (!(ambientTemperature < stoneColdTemperature && stoneColdTemperature < startTemperature)) {
    throw new GameRuleError('Invalid cooling tuning: need ambient < stone cold < start temperature')
  }
  if (!(secondsToStoneCold > 0 && Number.isFinite(secondsToStoneCold))) {
    throw new GameRuleError('Invalid cooling tuning: secondsToStoneCold must be a positive number')
  }
  const decaySeconds =
    secondsToStoneCold /
    Math.log((startTemperature - ambientTemperature) / (stoneColdTemperature - ambientTemperature))

  return (elapsedSeconds) =>
    ambientTemperature + (startTemperature - ambientTemperature) * Math.exp(-elapsedSeconds / decaySeconds)
}
