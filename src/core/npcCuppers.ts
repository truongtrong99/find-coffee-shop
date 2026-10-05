import type { CoolingCurve } from './cooling'
import { cueFor } from './cupping'
import type { CueConditions } from './cupping'
import { GameRuleError } from './errors'
import type { RandomSource } from './ports'
import { clampRating, mapAttributes } from './scoring'
import { ATTRIBUTES } from './types'
import type {
  Attribute,
  BlindCupContent,
  CuppingStep,
  NpcCupperContent,
  NpcCupperSummary,
  NpcSchedule,
  PerformedStep,
  Rating,
  ReferenceScore,
  TastingCue,
} from './types'

/** Each preparing step is done on every cup in turn before the next; Slurps come once every cup is skimmed. */
const PREPARING_STEPS: readonly CuppingStep[] = ['dry-fragrance', 'pour', 'break-the-crust', 'skim']

/**
 * Every Cupping Step an NPC Cupper will perform in an Attempt, in order. Each comes
 * `secondsBetweenSteps` after the last, and a Slurp also waits for the cups to cool to its slurp temperature.
 * After each Slurp they make the remark `remarkOn` gives for that cup at that Cup Temperature.
 */
export function planSchedule(
  schedule: NpcSchedule,
  cupLetters: readonly string[],
  cooling: CoolingCurve,
  remarkOn: (cupLetter: string, temperature: number) => TastingCue,
): PerformedStep[] {
  const planned: PerformedStep[] = []
  let atSeconds = 0
  const perform = (cupLetter: string, step: CuppingStep, earliest = 0) => {
    atSeconds = Math.max(atSeconds + schedule.secondsBetweenSteps, earliest)
    const temperature = cooling.temperatureAt(atSeconds)
    const remark = step === 'slurp' ? remarkOn(cupLetter, temperature) : undefined
    planned.push({ cupLetter, step, atSeconds, temperature, remark })
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

/**
 * The remark an NPC Cupper makes after a Slurp: a Tasting Cue about one Attribute, picked at random, that follows the
 * Accuracy Window at the Cup Temperature they slurped at just like the Player's own cues, then is shifted by their
 * Personality Bias and kept within 1–5 cups. A vague remark stays vague.
 */
export function npcRemark(npc: NpcCupperContent, cup: BlindCupContent, conditions: CueConditions): TastingCue {
  const attribute = ATTRIBUTES[Math.floor(conditions.random.next() * ATTRIBUTES.length)]!
  const cue = { ...cueFor(cup, 'slurp', attribute, conditions), remarkBy: summarize(npc) }
  if (cue.suggestedRating === undefined) return cue
  const rating = clampRating(Math.round(cue.suggestedRating + (npc.personalityBias[attribute] ?? 0)))
  return { ...cue, note: cup.tastingNotes[attribute][rating], suggestedRating: rating }
}

export function summarize({ id, name }: NpcCupperContent): NpcCupperSummary {
  return { id, name }
}

/**
 * The Lineup's NPC Cuppers in Seat order, given the ids of those unlocked; throws a GameRuleError naming the first
 * problem.
 */
export function seatLineup(
  npcCuppers: readonly NpcCupperContent[],
  unlocked: ReadonlySet<string>,
  seats: number,
  lineup: readonly string[],
): NpcCupperContent[] {
  if (lineup.length > seats) {
    throw new GameRuleError(`A Lineup of ${lineup.length} NPC Cuppers doesn't fit this Lab's ${seats} Seats`)
  }
  return lineup.map((id, seat) => {
    const npc = npcCuppers.find((n) => n.id === id)
    if (!npc) throw new GameRuleError(`There is no NPC Cupper "${id}"`)
    if (!unlocked.has(npc.id)) throw new GameRuleError(`${npc.name} is still locked`)
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
