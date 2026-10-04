import type { CoolingCurve } from './cooling'
import { GameRuleError } from './errors'
import type { RandomSource } from './ports'
import { clampRating, mapAttributes } from './scoring'
import type {
  Attribute,
  CuppingStep,
  NpcCupperContent,
  NpcCupperSummary,
  NpcSchedule,
  PerformedStep,
  Rating,
  ReferenceScore,
} from './types'

/** Each preparing step is done on every cup in turn before the next; Slurps come once every cup is skimmed. */
const PREPARING_STEPS: readonly CuppingStep[] = ['dry-fragrance', 'pour', 'break-the-crust', 'skim']

/**
 * Every Cupping Step an NPC Cupper will perform in an Attempt, in order. Each comes
 * `secondsBetweenSteps` after the last, and a Slurp also waits for the cups to cool to its slurp temperature.
 */
export function planSchedule(schedule: NpcSchedule, cupLetters: readonly string[], cooling: CoolingCurve): PerformedStep[] {
  const planned: PerformedStep[] = []
  let atSeconds = 0
  const perform = (cupLetter: string, step: CuppingStep, earliest = 0) => {
    atSeconds = Math.max(atSeconds + schedule.secondsBetweenSteps, earliest)
    planned.push({ cupLetter, step, atSeconds, temperature: cooling.temperatureAt(atSeconds) })
  }
  for (const step of PREPARING_STEPS) {
    for (const letter of cupLetters) perform(letter, step)
  }
  for (const slurpTemperature of schedule.slurpTemperatures) {
    const cooledAt = cooling.secondsToCoolTo(slurpTemperature)
    // A slurp temperature the cups never cool to is never reached; neither is any after it.
    if (!Number.isFinite(cooledAt)) break
    for (const letter of cupLetters) perform(letter, 'slurp', cooledAt)
  }
  return planned
}

export function summarize({ id, name }: NpcCupperContent): NpcCupperSummary {
  return { id, name }
}

/** Until progression tracks Stars, only starter NPC Cuppers are unlocked. */
export function isUnlocked(npc: NpcCupperContent): boolean {
  return npc.unlock.kind === 'starter'
}

/** The Lineup's NPC Cuppers in Seat order; throws a GameRuleError naming the first problem. */
export function seatLineup(npcCuppers: readonly NpcCupperContent[], seats: number, lineup: readonly string[]): NpcCupperContent[] {
  if (lineup.length > seats) {
    throw new GameRuleError(`A Lineup of ${lineup.length} NPC Cuppers doesn't fit this Lab's ${seats} Seats`)
  }
  return lineup.map((id, seat) => {
    const npc = npcCuppers.find((n) => n.id === id)
    if (!npc) throw new GameRuleError(`There is no NPC Cupper "${id}"`)
    if (!isUnlocked(npc)) throw new GameRuleError(`${npc.name} is still locked`)
    if (lineup.indexOf(id) !== seat) throw new GameRuleError(`${npc.name} can only fill one Seat`)
    return npc
  })
}

/**
 * An NPC Cupper's Score Card for a cup: per Attribute, the Reference Score plus their Personality Bias
 * plus noise drawn evenly from ±`noise`, rounded to whole cups and kept within 1–5.
 */
export function npcScoreCard(
  npc: NpcCupperContent,
  referenceScore: ReferenceScore,
  noise: number,
  random: RandomSource,
): Record<Attribute, Rating> {
  return mapAttributes((attribute) => {
    const noiseOffset = (random.next() * 2 - 1) * noise
    return clampRating(Math.round(referenceScore[attribute] + (npc.personalityBias[attribute] ?? 0) + noiseOffset))
  })
}
