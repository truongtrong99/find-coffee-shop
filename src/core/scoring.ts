import { ATTRIBUTES } from './types'
import type { Attribute, BlindCupContent, Rating, RevealResult, ScoreCard, StarCount } from './types'

export const ATTRIBUTE_NAMES: Record<Attribute, string> = {
  aroma: 'Aroma',
  flavor: 'Flavor',
  acidity: 'Acidity',
  body: 'Body',
  sweetness: 'Sweetness',
}

/** Whether `value` is a whole rating of 1–5 cups. */
export function isRating(value: number): value is Rating {
  return Number.isInteger(value) && value >= 1 && value <= 5
}

/** The Attributes not yet rated on a Score Card, in Score Card order. */
export function unratedAttributes(scoreCard: ScoreCard): Attribute[] {
  return ATTRIBUTES.filter((attribute) => scoreCard[attribute] === undefined)
}

const POINTS_FOR_EXACT = 3
const POINTS_FOR_OFF_BY_ONE = 1

function calibrationPoints(rating: Rating, reference: Rating): number {
  const off = Math.abs(rating - reference)
  return off === 0 ? POINTS_FOR_EXACT : off === 1 ? POINTS_FOR_OFF_BY_ONE : 0
}

/** Stars by share of the maximum Calibration Points, highest threshold first. */
const STAR_THRESHOLDS: readonly { stars: StarCount; percent: number }[] = [
  { stars: 3, percent: 90 },
  { stars: 2, percent: 70 },
  { stars: 1, percent: 50 },
]

function starsFor(points: number, maxPoints: number): StarCount {
  // Compared in whole numbers so a share exactly on a threshold is never lost to floating point.
  return STAR_THRESHOLDS.find(({ percent }) => points * 100 >= maxPoints * percent)?.stars ?? 0
}

function mapAttributes<T>(fn: (attribute: Attribute) => T): Record<Attribute, T> {
  return Object.fromEntries(ATTRIBUTES.map((attribute) => [attribute, fn(attribute)])) as Record<Attribute, T>
}

/** Scores each submitted Score Card against its Blind Cup's Reference Score. Every Score Card must be complete. */
export function revealAttempt(
  sessionId: string,
  cups: readonly { content: BlindCupContent; scoreCard: ScoreCard }[],
): RevealResult {
  const revealed = cups.map(({ content: cup, scoreCard: submitted }) => {
    const scoreCard = mapAttributes((attribute) => submitted[attribute]!)
    return {
      letter: cup.letter,
      origin: cup.origin,
      story: cup.story,
      referenceScore: { ...cup.referenceScore },
      scoreCard,
      calibrationPoints: mapAttributes((attribute) => calibrationPoints(scoreCard[attribute], cup.referenceScore[attribute])),
    }
  })
  const points = revealed.reduce(
    (sum, cup) => sum + ATTRIBUTES.reduce((cupSum, attribute) => cupSum + cup.calibrationPoints[attribute], 0),
    0,
  )
  const maxPoints = cups.length * ATTRIBUTES.length * POINTS_FOR_EXACT
  return {
    sessionId,
    cups: revealed,
    calibrationPoints: points,
    maxCalibrationPoints: maxPoints,
    stars: starsFor(points, maxPoints),
  }
}
