import { GameRuleError } from './errors'
import { ATTRIBUTES } from './types'
import type { RandomSource } from './ports'
import type { Attribute, BlindCupContent, CuppingStep, Rating, TastingCue, WindowPosition } from './types'

export const STEP_NAMES: Record<CuppingStep, string> = {
  'dry-fragrance': 'Dry Fragrance',
  pour: 'Pour',
  'break-the-crust': 'Break the Crust',
  skim: 'Skim',
  slurp: 'Slurp',
}

/**
 * Strict order: Dry Fragrance → Pour → Break the Crust → Skim, then Slurp as often as the Player likes.
 * Dry Fragrance is optional but only allowed before Pour.
 */
function nextValidSteps(completedSteps: readonly CuppingStep[]): CuppingStep[] {
  switch (completedSteps.at(-1)) {
    case undefined:
      return ['dry-fragrance', 'pour']
    case 'dry-fragrance':
      return ['pour']
    case 'pour':
      return ['break-the-crust']
    case 'break-the-crust':
      return ['skim']
    case 'skim':
    case 'slurp':
      return ['slurp']
  }
}

/** Throws a GameRuleError naming the next valid step when `step` can't be performed after `completedSteps`. */
export function assertStepAllowed(cupLetter: string, completedSteps: readonly CuppingStep[], step: CuppingStep): void {
  const allowed = nextValidSteps(completedSteps)
  if (allowed.includes(step)) return

  const next = allowed.map((s) => STEP_NAMES[s]).join(' or ')
  const problem =
    step === 'dry-fragrance' && completedSteps.includes('pour')
      ? 'Dry Fragrance is only allowed before Pour'
      : `can't ${STEP_NAMES[step]} now`
  throw new GameRuleError(`Cup ${cupLetter}: ${problem}; the next step is ${next}`)
}

/** What a cue depends on besides the coffee and the Cupping Step. */
export interface CueConditions {
  /** The Cup Temperature at the moment of the step. */
  temperature: number
  /** Where that Cup Temperature sits against each Attribute's Accuracy Window. */
  windows: Record<Attribute, WindowPosition>
  vagueTastingNotes: Record<Attribute, string>
  /** Chance, 0–1, that a cue outside its Accuracy Window is skewed rather than vague. */
  skewedCueChance: number
  random: RandomSource
}

/** Outside the Accuracy Window, by chance either vague (undefined) or one cup off the Reference Score, either way. */
function ratingOutsideWindow(reference: Rating, { skewedCueChance, random }: CueConditions): Rating | undefined {
  if (random.next() >= skewedCueChance) return undefined
  const towards = reference === 1 ? 1 : reference === 5 ? -1 : random.next() < 0.5 ? -1 : 1
  return (reference + towards) as Rating
}

/**
 * The Tasting Cues a Cupping Step gives: Dry Fragrance and Break the Crust each give an Aroma cue,
 * and a Slurp gives one cue per Attribute. A cue is noted from the Reference Score inside the
 * Attribute's Accuracy Window; outside it, the cue is vague or skewed; from a stone-cold cup, it is always vague.
 */
export function cuesForStep(cup: BlindCupContent, step: CuppingStep, conditions: CueConditions): TastingCue[] {
  const { temperature, windows, vagueTastingNotes } = conditions
  const cue = (attribute: Attribute): TastingCue => {
    const window = windows[attribute]
    const reference = cup.referenceScore[attribute]
    const rating =
      window === 'inside' ? reference : window === 'stone-cold' ? undefined : ratingOutsideWindow(reference, conditions)
    return {
      step,
      attribute,
      note: rating === undefined ? vagueTastingNotes[attribute] : cup.tastingNotes[attribute][rating],
      temperature,
      window,
      suggestedRating: rating,
    }
  }
  switch (step) {
    case 'dry-fragrance':
    case 'break-the-crust':
      return [cue('aroma')]
    case 'slurp':
      return ATTRIBUTES.map(cue)
    default:
      return []
  }
}
