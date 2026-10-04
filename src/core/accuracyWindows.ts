import { GameRuleError } from './errors'
import { ATTRIBUTE_NAMES } from './scoring'
import { ATTRIBUTES } from './types'
import type { AccuracyWindow, TastingTuning, WindowPosition } from './types'

/** Throws a GameRuleError naming the first problem: an upside-down Accuracy Window, or a chance outside 0–1. */
export function assertValidTastingTuning({ accuracyWindows, skewedCueChance }: TastingTuning): void {
  const invalid = ATTRIBUTES.find((attribute) => !(accuracyWindows[attribute].min <= accuracyWindows[attribute].max))
  if (invalid) {
    throw new GameRuleError(`Invalid Accuracy Window for ${ATTRIBUTE_NAMES[invalid]}: its min must not be above its max`)
  }
  if (!(skewedCueChance >= 0 && skewedCueChance <= 1)) {
    throw new GameRuleError(`Invalid skewed cue chance ${skewedCueChance}: it must be from 0 to 1`)
  }
}

/** A cup is stone cold at or below the stone cold temperature. */
export function isStoneCold(temperature: number, stoneColdTemperature: number): boolean {
  return temperature <= stoneColdTemperature
}

/** Where `temperature` sits against an Accuracy Window; a stone-cold cup is stone cold whatever the window. */
export function windowPosition(temperature: number, window: AccuracyWindow, stoneColdTemperature: number): WindowPosition {
  if (isStoneCold(temperature, stoneColdTemperature)) return 'stone-cold'
  if (temperature > window.max) return 'too-hot'
  if (temperature < window.min) return 'too-cold'
  return 'inside'
}
