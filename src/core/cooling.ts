import { GameRuleError } from './errors'
import type { CoolingTuning } from './types'

export interface CoolingCurve {
  /** Cup Temperature after `elapsedSeconds` of the Attempt. */
  temperatureAt(elapsedSeconds: number): number
  /** Game seconds into the Attempt when the cups have cooled to `temperature`; Infinity if they never will. */
  secondsToCoolTo(temperature: number): number
}

/**
 * Newton's law of cooling: the cup's excess over ambient decays exponentially.
 * The decay constant is derived so the cup reaches the stone cold temperature
 * after exactly `secondsToStoneCold`, which is the intuitive knob to tune.
 */
export function createCoolingCurve(tuning: CoolingTuning): CoolingCurve {
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

  return {
    temperatureAt: (elapsedSeconds) =>
      ambientTemperature + (startTemperature - ambientTemperature) * Math.exp(-elapsedSeconds / decaySeconds),
    secondsToCoolTo(temperature) {
      if (temperature >= startTemperature) return 0
      if (temperature <= ambientTemperature) return Number.POSITIVE_INFINITY
      return decaySeconds * Math.log((startTemperature - ambientTemperature) / (temperature - ambientTemperature))
    },
  }
}
