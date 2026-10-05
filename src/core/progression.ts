import type { LabContent, LabMap, StarCount } from './types'

/** The best Stars per Cupping Session id; a session never starred is absent. */
export type BestStars = Readonly<Record<string, StarCount>>

export function totalStars(best: BestStars): number {
  return Object.values(best).reduce<number>((sum, stars) => sum + stars, 0)
}

export function isLabUnlocked(lab: LabContent, best: BestStars): boolean {
  return totalStars(best) >= lab.starsToUnlock
}

export function labMap(labs: readonly LabContent[], best: BestStars): LabMap {
  return {
    totalStars: totalStars(best),
    labs: labs.map((lab) => ({
      id: lab.id,
      name: lab.name,
      starsToUnlock: lab.starsToUnlock,
      unlocked: isLabUnlocked(lab, best),
      sessions: lab.sessions.map((session) => ({ id: session.id, name: session.name, bestStars: best[session.id] ?? 0 })),
    })),
  }
}

/** What an Attempt that earned `stars` changes in progression. */
export interface RecordedAttempt {
  best: BestStars
  /** Whether the Stars beat every earlier Attempt of the Cupping Session. */
  newBest: boolean
  /** The Labs locked before the Attempt and unlocked after it, in content order. */
  unlockedLabs: LabContent[]
}

/** Keeps the Stars as the Cupping Session's best if they beat it, and finds the Labs that unlocks. */
export function recordAttempt(labs: readonly LabContent[], best: BestStars, sessionId: string, stars: StarCount): RecordedAttempt {
  const newBest = stars > (best[sessionId] ?? 0)
  const after = newBest ? { ...best, [sessionId]: stars } : best
  return {
    best: after,
    newBest,
    unlockedLabs: labs.filter((lab) => !isLabUnlocked(lab, best) && isLabUnlocked(lab, after)),
  }
}

const SAVE_VERSION = 1

/** Progress as the save store keeps it. Only progression is saved, never an Attempt. */
interface SavedProgress {
  version: typeof SAVE_VERSION
  bestStars: Record<string, StarCount>
}

export function serializeProgress(best: BestStars): string {
  const saved: SavedProgress = { version: SAVE_VERSION, bestStars: { ...best } }
  return JSON.stringify(saved)
}

function isStarCount(value: unknown): value is StarCount {
  return value === 0 || value === 1 || value === 2 || value === 3
}

/**
 * The best Stars in a save, keeping only Cupping Sessions the content still has. A missing, unreadable or
 * unrecognised save is fresh progress rather than an error, so a bad save never stops the game loading.
 */
export function loadProgress(serialized: string | null, labs: readonly LabContent[]): BestStars {
  if (serialized === null) return {}
  let saved: unknown
  try {
    saved = JSON.parse(serialized)
  } catch {
    return {}
  }
  if (typeof saved !== 'object' || saved === null || !('version' in saved) || saved.version !== SAVE_VERSION) return {}
  const stars = (saved as Partial<SavedProgress>).bestStars
  if (typeof stars !== 'object' || stars === null) return {}
  const best: Record<string, StarCount> = {}
  for (const session of labs.flatMap((lab) => lab.sessions)) {
    const sessionStars = (stars as Record<string, unknown>)[session.id]
    if (isStarCount(sessionStars) && sessionStars > 0) best[session.id] = sessionStars
  }
  return best
}
