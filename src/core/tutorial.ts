import { nextValidSteps } from './cupping'
import { GameRuleError } from './errors'
import { seatLineup } from './npcCuppers'
import { unratedAttributes } from './scoring'
import { ATTRIBUTES } from './types'
import type { BlindCupState, CuppingSessionContent, LabContent, NpcCupperContent, TutorialPrompt } from './types'

/** Throws a GameRuleError unless every tutorial can be played on first launch: its Lab open and its Lineup seatable. */
export function assertValidTutorials(labs: readonly LabContent[], npcCuppers: readonly NpcCupperContent[]): void {
  for (const lab of labs) {
    for (const session of lab.sessions) {
      if (!session.tutorial) continue
      const problem = `Invalid tutorial "${session.name}"`
      if (lab.starsToUnlock > 0) {
        throw new GameRuleError(`${problem}: ${lab.name} needs ${lab.starsToUnlock} Stars, so it is locked on first launch`)
      }
      try {
        seatLineup(npcCuppers, lab.seats, session.tutorial.lineup)
      } catch (error) {
        if (!(error instanceof GameRuleError)) throw error
        throw new GameRuleError(`${problem}: ${error.message}`)
      }
    }
  }
}

/** Throws a GameRuleError naming the pre-filled Lineup when a tutorial is given any other. */
export function assertTutorialLineup(
  session: CuppingSessionContent,
  npcCuppers: readonly NpcCupperContent[],
  lineup: readonly string[],
): void {
  const prefilled = session.tutorial?.lineup
  if (prefilled === undefined) return
  if (lineup.length === prefilled.length && lineup.every((id, seat) => id === prefilled[seat])) return
  const names = prefilled.map((id) => npcCuppers.find((npc) => npc.id === id)?.name ?? id)
  throw new GameRuleError(`The tutorial's Lineup is pre-filled: ${names.join(', ')}`)
}

/** The Attributes a cup is still to be tasted accurately for, split by whether their Accuracy Window is open now. */
function untasted(cup: BlindCupState) {
  const pending = ATTRIBUTES.filter(
    (attribute) => !cup.cues.some((cue) => cue.attribute === attribute && cue.window === 'inside'),
  )
  return {
    slurpNow: pending.filter((attribute) => cup.windows[attribute] === 'inside'),
    waitFor: pending.filter((attribute) => cup.windows[attribute] === 'too-hot'),
  }
}

/**
 * Guides one cup at a time through its Cupping Steps up to its first Slurp, then has the Player Slurp each cup
 * inside every Accuracy Window still to come, preferring a cup with a window open now, then fill each Score Card
 * in turn. Once every Score Card is complete, whenever that is, it prompts Submit.
 */
export function tutorialPrompt(cups: readonly BlindCupState[]): TutorialPrompt {
  if (cups.every((cup) => cup.scoreCardComplete)) return { kind: 'submit' }

  const unslurped = cups.find((cup) => !cup.completedSteps.includes('slurp'))
  if (unslurped) return { kind: 'cupping-step', cupLetter: unslurped.letter, step: nextValidSteps(unslurped.completedSteps)[0]! }

  const toTaste = cups.map((cup) => ({ cupLetter: cup.letter, ...untasted(cup) }))
  const next = toTaste.find(({ slurpNow }) => slurpNow.length > 0) ?? toTaste.find(({ waitFor }) => waitFor.length > 0)
  if (next) return { kind: 'accuracy-windows', ...next }

  const unrated = cups.find((cup) => !cup.scoreCardComplete)!
  return { kind: 'score-card', cupLetter: unrated.letter, unrated: unratedAttributes(unrated.scoreCard) }
}
