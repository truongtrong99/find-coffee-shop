import { nextValidSteps } from './cupping'
import { GameRuleError } from './errors'
import { seatLineup } from './npcCuppers'
import { npcCuppersUnlockedBy } from './progression'
import { unratedAttributes } from './scoring'
import { ATTRIBUTES } from './types'
import type { BlindCupState, CuppingSessionContent, LabContent, NpcCupperContent, TutorialPrompt } from './types'

/**
 * Throws a GameRuleError unless the only tutorial is Lab 1's first Cupping Session and can be played on first launch:
 * its Lab open and its Lineup seatable.
 */
export function assertValidTutorials(labs: readonly LabContent[], npcCuppers: readonly NpcCupperContent[]): void {
  for (const [labIndex, lab] of labs.entries()) {
    for (const [sessionIndex, session] of lab.sessions.entries()) {
      if (!session.tutorial) continue
      const problem = `Invalid tutorial "${session.name}"`
      if (labIndex > 0 || sessionIndex > 0) {
        throw new GameRuleError(`${problem}: only Lab 1's first Cupping Session can be the tutorial`)
      }
      if (lab.starsToUnlock > 0) {
        throw new GameRuleError(`${problem}: ${lab.name} needs ${lab.starsToUnlock} Stars, so it is locked on first launch`)
      }
      try {
        seatLineup(npcCuppers, npcCuppersUnlockedBy(npcCuppers, {}), lab.seats, session.tutorial.lineup)
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

/**
 * The Accuracy Windows a cup is still to be tasted inside: those of Attributes with no accurate cue in its Cue Log,
 * split into open now and still too hot. A window the cup has cooled past is let go.
 */
function windowsToTaste(cup: BlindCupState) {
  const untasted = ATTRIBUTES.filter(
    (attribute) => !cup.cues.some((cue) => cue.attribute === attribute && cue.window === 'inside'),
  )
  return {
    slurpNow: untasted.filter((attribute) => cup.windows[attribute] === 'inside'),
    waitFor: untasted.filter((attribute) => cup.windows[attribute] === 'too-hot'),
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

  const toTaste = cups.map((cup) => ({ cupLetter: cup.letter, ...windowsToTaste(cup) }))
  const next = toTaste.find(({ slurpNow }) => slurpNow.length > 0) ?? toTaste.find(({ waitFor }) => waitFor.length > 0)
  if (next) return { kind: 'accuracy-windows', ...next }

  const unrated = cups.find((cup) => !cup.scoreCardComplete)!
  return { kind: 'score-card', cupLetter: unrated.letter, unrated: unratedAttributes(unrated.scoreCard) }
}
