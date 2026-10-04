import { GameRuleError } from './errors'
import { ATTRIBUTES } from './types'
import type { Attribute, BlindCupContent, CuppingStep, TastingCue } from './types'

const STEP_NAMES: Record<CuppingStep, string> = {
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

/**
 * The Tasting Cues a Cupping Step gives: Dry Fragrance and Break the Crust each give an Aroma cue,
 * and a Slurp gives one cue per Attribute. Cues ignore Cup Temperature for now.
 */
export function cuesForStep(cup: BlindCupContent, step: CuppingStep): TastingCue[] {
  const cue = (attribute: Attribute): TastingCue => ({
    step,
    attribute,
    note: cup.tastingNotes[attribute][cup.referenceScore[attribute]],
  })
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
