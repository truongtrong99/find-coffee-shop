import { assertValidTastingTuning } from './accuracyWindows'
import { GameRuleError } from './errors'
import { assertValidUnlockRules } from './progression'
import { ATTRIBUTE_NAMES, isRating } from './scoring'
import { assertValidTutorials } from './tutorial'
import { ATTRIBUTES } from './types'
import type { BlindCupContent, CuppingSessionContent, GameContent, LabContent, Rating } from './types'

const SEATS = { min: 2, max: 4 }
const CUPS_PER_SESSION = { min: 3, max: 5 }
const CUP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const RATINGS: readonly Rating[] = [1, 2, 3, 4, 5]

/**
 * Throws a GameRuleError naming the first problem with the content, so a mistake is caught when the Game Core is
 * constructed rather than mid-Attempt. The cooling tuning is checked where the cooling curve is made.
 */
export function assertValidContent(content: GameContent): void {
  assertValidTastingTuning(content.tuning.tasting)
  assertUniqueIds('Lab', content.labs)
  assertUniqueIds('Cupping Session', content.labs.flatMap((lab) => lab.sessions))
  assertUniqueIds('NPC Cupper', content.npcCuppers)
  for (const lab of content.labs) assertValidLab(lab)
  assertOriginsNewToEachLab(content.labs)
  assertValidTutorials(content.labs, content.npcCuppers)
  assertValidUnlockRules(content)
}

function assertUniqueIds(kind: string, items: readonly { id: string }[]): void {
  const seen = new Set<string>()
  for (const { id } of items) {
    if (seen.has(id)) throw new GameRuleError(`Duplicate ${kind} id "${id}"`)
    seen.add(id)
  }
}

function assertValidLab(lab: LabContent): void {
  if (!(Number.isInteger(lab.seats) && lab.seats >= SEATS.min && lab.seats <= SEATS.max)) {
    throw new GameRuleError(`${lab.name} has ${lab.seats} Seat${lab.seats === 1 ? '' : 's'}; it must have ${SEATS.min} to ${SEATS.max}`)
  }
  const cups = lab.cupsPerSession
  if (!(Number.isInteger(cups) && cups >= CUPS_PER_SESSION.min && cups <= CUPS_PER_SESSION.max)) {
    throw new GameRuleError(
      `${lab.name} has ${cups} Blind Cups per Cupping Session; it must have ${CUPS_PER_SESSION.min} to ${CUPS_PER_SESSION.max}`,
    )
  }
  for (const session of lab.sessions) {
    if (session.cups.length !== cups) {
      throw new GameRuleError(
        `"${session.name}" has ${session.cups.length} Blind Cups, but every Cupping Session in ${lab.name} has ${cups}`,
      )
    }
    assertCupLetters(session)
    for (const cup of session.cups) assertValidCup(session, cup)
  }
}

/** Blind Cups are lettered A, B, C, … in table order. */
function assertCupLetters(session: CuppingSessionContent): void {
  const letters = session.cups.map((cup) => cup.letter)
  const expected = [...CUP_LETTERS.slice(0, letters.length)]
  if (letters.some((letter, i) => letter !== expected[i])) {
    throw new GameRuleError(`"${session.name}" letters its Blind Cups ${letters.join(', ')}; they must run ${expected.join(', ')}`)
  }
}

function assertValidCup(session: CuppingSessionContent, cup: BlindCupContent): void {
  const problem = `Invalid Cup ${cup.letter} in "${session.name}"`
  for (const attribute of ATTRIBUTES) {
    const reference: number = cup.referenceScore[attribute]
    if (!isRating(reference)) {
      throw new GameRuleError(
        `${problem}: its Reference Score for ${ATTRIBUTE_NAMES[attribute]} is ${reference}; ratings are whole steps from 1 to 5 cups`,
      )
    }
    const missing = RATINGS.find((rating) => !cup.tastingNotes[attribute]?.[rating])
    if (missing !== undefined) {
      throw new GameRuleError(`${problem}: no tasting note for ${ATTRIBUTE_NAMES[attribute]} ${missing}`)
    }
  }
}

/** Each Lab's coffees come from origins no earlier Lab has; within a Lab, an origin may return. */
function assertOriginsNewToEachLab(labs: readonly LabContent[]): void {
  const introducedBy = new Map<string, LabContent>()
  for (const lab of labs) {
    for (const { origin } of lab.sessions.flatMap((session) => session.cups)) {
      const earlier = introducedBy.get(origin)
      if (earlier && earlier !== lab) {
        throw new GameRuleError(`"${origin}" in ${lab.name} is not new to that Lab: it is already cupped in ${earlier.name}`)
      }
      introducedBy.set(origin, earlier ?? lab)
    }
  }
}
