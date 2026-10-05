import { GameRuleError } from './errors'
import { ATTRIBUTES } from './types'
import type {
  Attribute,
  GameContent,
  LabContent,
  LabMap,
  NpcCupperContent,
  StarCount,
  UnlockDescription,
  UnlockRule,
} from './types'

/** The best Stars per Cupping Session id; a session never starred is absent. */
export type BestStars = Readonly<Record<string, StarCount>>

/** Per Attribute, the cups an NPC Cupper's Personality Bias adds to the Reference Score. */
export type Bias = Partial<Record<Attribute, number>>

/** Everything the Player has earned, as saved between visits. */
export interface Progress {
  bestStars: BestStars
  /** The ids of the NPC Cuppers unlocked so far; once unlocked, an NPC Cupper stays unlocked. */
  unlockedNpcCuppers: ReadonlySet<string>
  /** Per NPC Cupper id, the Personality Bias Reveals have shown; an NPC Cupper with nothing shown is absent. */
  discoveredBiases: Readonly<Record<string, Bias>>
}

type ProgressionContent = Pick<GameContent, 'labs' | 'npcCuppers'>

export function totalStars(best: BestStars): number {
  return Object.values(best).reduce<number>((sum, stars) => sum + stars, 0)
}

export function isLabUnlocked(lab: LabContent, best: BestStars): boolean {
  return totalStars(best) >= lab.starsToUnlock
}

function meetsUnlockRule(rule: UnlockRule, best: BestStars): boolean {
  switch (rule.kind) {
    case 'starter':
      return true
    case 'total-stars':
      return totalStars(best) >= rule.stars
    case 'three-stars':
      return best[rule.sessionId] === 3
  }
}

/** The ids of the NPC Cuppers unlocked with these best Stars and none unlocked before; on first launch, the starters. */
export function npcCuppersUnlockedBy(npcCuppers: readonly NpcCupperContent[], best: BestStars): Set<string> {
  return new Set(npcCuppers.filter((npc) => meetsUnlockRule(npc.unlock, best)).map((npc) => npc.id))
}

function findSessionName(labs: readonly LabContent[], sessionId: string): string | undefined {
  return labs.flatMap((lab) => lab.sessions).find((session) => session.id === sessionId)?.name
}

/** Throws a GameRuleError naming the first NPC Cupper whose unlock rule names a Cupping Session the content lacks. */
export function assertValidUnlockRules({ labs, npcCuppers }: ProgressionContent): void {
  for (const npc of npcCuppers) {
    if (npc.unlock.kind === 'three-stars' && findSessionName(labs, npc.unlock.sessionId) === undefined) {
      throw new GameRuleError(`${npc.name} unlocks by 3-starring a Cupping Session, but there is no Cupping Session "${npc.unlock.sessionId}"`)
    }
  }
}

/** An unlock rule as the Player is told it; the content's unlock rules are valid. */
export function describeUnlock(rule: UnlockRule, labs: readonly LabContent[]): UnlockDescription {
  return rule.kind === 'three-stars' ? { ...rule, sessionName: findSessionName(labs, rule.sessionId)! } : { ...rule }
}

export function labMap(labs: readonly LabContent[], best: BestStars): LabMap {
  return {
    totalStars: totalStars(best),
    labs: labs.map((lab) => ({
      id: lab.id,
      name: lab.name,
      starsToUnlock: lab.starsToUnlock,
      unlocked: isLabUnlocked(lab, best),
      sessions: lab.sessions.map((session) => ({
        id: session.id,
        name: session.name,
        bestStars: best[session.id] ?? 0,
        tutorial: session.tutorial !== undefined,
      })),
    })),
  }
}

/** What a Submitted Attempt brings to progression. */
export interface AttemptOutcome {
  sessionId: string
  stars: StarCount
  /** Each Lineup NPC Cupper with the Personality Bias their Score Cards showed at the Reveal. */
  shownBiases: readonly { npc: NpcCupperContent; bias: Bias }[]
}

/** What a Submitted Attempt changes in progression. */
export interface RecordedAttempt {
  progress: Progress
  /** Whether the Stars beat every earlier Attempt of the Cupping Session. */
  newBest: boolean
  /** The Labs locked before the Attempt and unlocked after it, in content order. */
  unlockedLabs: LabContent[]
  /** The NPC Cuppers locked before the Attempt and unlocked after it, in content order. */
  unlockedNpcCuppers: NpcCupperContent[]
  /** The Personality Biases shown for the first time, in Lineup then Score Card order. */
  discoveries: { npc: NpcCupperContent; attribute: Attribute; bias: number }[]
}

/**
 * Keeps the Stars as the Cupping Session's best if they beat it, unlocks the Labs and NPC Cuppers that brings,
 * and records in the Cupper Journal any Personality Bias shown for the first time.
 */
export function recordAttempt(
  { labs, npcCuppers }: ProgressionContent,
  progress: Progress,
  { sessionId, stars, shownBiases }: AttemptOutcome,
): RecordedAttempt {
  const best = progress.bestStars
  const newBest = stars > (best[sessionId] ?? 0)
  const after = newBest ? { ...best, [sessionId]: stars } : best
  const meetingRules = npcCuppersUnlockedBy(npcCuppers, after)
  const unlockedNpcCuppers = npcCuppers.filter((npc) => !progress.unlockedNpcCuppers.has(npc.id) && meetingRules.has(npc.id))

  const discoveredBiases = { ...progress.discoveredBiases }
  const discoveries: RecordedAttempt['discoveries'] = []
  for (const { npc, bias } of shownBiases) {
    const known = discoveredBiases[npc.id] ?? {}
    for (const attribute of ATTRIBUTES) {
      const shown = bias[attribute]
      if (shown !== undefined && known[attribute] === undefined) discoveries.push({ npc, attribute, bias: shown })
    }
    discoveredBiases[npc.id] = { ...known, ...bias }
  }

  return {
    progress: {
      bestStars: after,
      unlockedNpcCuppers: new Set([...progress.unlockedNpcCuppers, ...unlockedNpcCuppers.map((npc) => npc.id)]),
      discoveredBiases,
    },
    newBest,
    unlockedLabs: labs.filter((lab) => !isLabUnlocked(lab, best) && isLabUnlocked(lab, after)),
    unlockedNpcCuppers,
    discoveries,
  }
}

const SAVE_VERSION = 1

/**
 * Progress as the save store keeps it. Only progression is saved, never an Attempt. Saves from before NPC Cuppers
 * unlocked or the Cupper Journal filled in lack those fields.
 */
interface SavedProgress {
  version: typeof SAVE_VERSION
  bestStars: Record<string, StarCount>
  unlockedNpcCuppers?: string[]
  discoveredBiases?: Record<string, Bias>
}

export function serializeProgress({ bestStars, unlockedNpcCuppers, discoveredBiases }: Progress): string {
  const saved: SavedProgress = {
    version: SAVE_VERSION,
    bestStars: { ...bestStars },
    unlockedNpcCuppers: [...unlockedNpcCuppers],
    discoveredBiases: { ...discoveredBiases },
  }
  return JSON.stringify(saved)
}

function isStarCount(value: unknown): value is StarCount {
  return value === 0 || value === 1 || value === 2 || value === 3
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** The saved best Stars, keeping only Cupping Sessions the content still has. */
function loadBestStars(saved: unknown, labs: readonly LabContent[]): BestStars {
  if (!isRecord(saved)) return {}
  const best: Record<string, StarCount> = {}
  for (const session of labs.flatMap((lab) => lab.sessions)) {
    const sessionStars = saved[session.id]
    if (isStarCount(sessionStars) && sessionStars > 0) best[session.id] = sessionStars
  }
  return best
}

/** The saved discoveries, keeping only those that still match the content's NPC Cuppers' Personality Biases. */
function loadDiscoveredBiases(saved: unknown, npcCuppers: readonly NpcCupperContent[]): Record<string, Bias> {
  if (!isRecord(saved)) return {}
  const discovered: Record<string, Bias> = {}
  for (const npc of npcCuppers) {
    const savedBias = saved[npc.id]
    if (!isRecord(savedBias)) continue
    const bias: Bias = {}
    for (const attribute of ATTRIBUTES) {
      if (savedBias[attribute] !== undefined && savedBias[attribute] === npc.personalityBias[attribute]) {
        bias[attribute] = npc.personalityBias[attribute]
      }
    }
    if (Object.keys(bias).length > 0) discovered[npc.id] = bias
  }
  return discovered
}

/**
 * The progress in a save, keeping only what the content still has. NPC Cuppers saved as unlocked stay unlocked,
 * along with any whose unlock rule the saved Stars meet. A missing, unreadable or unrecognised save is fresh
 * progress rather than an error, so a bad save never stops the game loading.
 */
export function loadProgress(serialized: string | null, { labs, npcCuppers }: ProgressionContent): Progress {
  let saved: unknown = null
  try {
    if (serialized !== null) saved = JSON.parse(serialized)
  } catch {
    // Unreadable: fresh progress.
  }
  const recognised = isRecord(saved) && saved.version === SAVE_VERSION ? (saved as Partial<SavedProgress>) : {}
  const bestStars = loadBestStars(recognised.bestStars, labs)
  const savedUnlocks = Array.isArray(recognised.unlockedNpcCuppers) ? recognised.unlockedNpcCuppers : []
  return {
    bestStars,
    unlockedNpcCuppers: new Set([
      ...npcCuppers.filter((npc) => savedUnlocks.includes(npc.id)).map((npc) => npc.id),
      ...npcCuppersUnlockedBy(npcCuppers, bestStars),
    ]),
    discoveredBiases: loadDiscoveredBiases(recognised.discoveredBiases, npcCuppers),
  }
}
