import { describeUnlock } from './progression'
import type { Progress } from './progression'
import { isRating } from './scoring'
import { ATTRIBUTES } from './types'
import type { CupperJournalEntry, GameContent, NpcCupperContent, PersonalityBias, RevealedCup } from './types'

/**
 * The Personality Bias an NPC Cupper's Score Cards show at a Reveal. A bias on an Attribute shows when, over the
 * cups where it could (the Reference Score shifted by it stays within 1–5 cups), their ratings average within half a
 * cup of the Reference Score shifted by it. Ratings held to 1–5 cups can hide a bias, and noise can blur one.
 */
function biasShown(npc: NpcCupperContent, seat: number, cups: readonly RevealedCup[]): PersonalityBias {
  const shown: PersonalityBias = {}
  for (const attribute of ATTRIBUTES) {
    const bias = npc.personalityBias[attribute]
    if (!bias) continue
    const offsets = cups
      .filter(({ referenceScore }) => isRating(referenceScore[attribute] + bias))
      .map(({ referenceScore, npcScoreCards }) => npcScoreCards[seat]!.scoreCard[attribute] - referenceScore[attribute])
    if (offsets.length === 0) continue
    const meanOffset = offsets.reduce((sum, offset) => sum + offset, 0) / offsets.length
    if (Math.abs(meanOffset - bias) < 0.5) shown[attribute] = bias
  }
  return shown
}

/** Each Lineup NPC Cupper, in Seat order, with the Personality Bias their Score Cards show at the Reveal. */
export function biasesShown(lineup: readonly NpcCupperContent[], cups: readonly RevealedCup[]) {
  return lineup.map((npc, seat) => ({ npc, bias: biasShown(npc, seat, cups) }))
}

/** An entry per NPC Cupper, in content order. */
export function cupperJournal({ labs, npcCuppers }: Pick<GameContent, 'labs' | 'npcCuppers'>, progress: Progress): CupperJournalEntry[] {
  return npcCuppers.map((npc) => ({
    id: npc.id,
    name: npc.name,
    unlocked: progress.unlockedNpcCuppers.has(npc.id),
    unlock: describeUnlock(npc.unlock, labs),
    hint: npc.journalHint,
    discoveredBias: { ...progress.discoveredBiases[npc.id] },
  }))
}
